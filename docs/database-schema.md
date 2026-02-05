# MDI Database Schema Documentation

## Overview

This document outlines the database schema for Mountaineer Dynamics Institute's digital ecosystem. The schema is designed for PostgreSQL but can be adapted for MySQL/MariaDB.

---

## Entity Relationship Diagram (Simplified)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   USERS     │────<│  ORDERS     │────<│ ORDER_ITEMS │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │                   │                    │
      ▼                   │                    ▼
┌─────────────┐           │            ┌─────────────┐
│  WAIVERS    │           │            │  COURSES    │
└─────────────┘           │            └─────────────┘
      │                   │                    │
      │                   │                    │
      ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│REGISTRATIONS│────<│ SCHEDULE    │>────│ INSTRUCTORS │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Tables

### 1. USERS

Stores customer account information.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE NOT NULL,
    
    -- Address
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(2),
    zip_code        VARCHAR(10),
    
    -- Metadata
    email_verified  BOOLEAN DEFAULT FALSE,
    newsletter_opt  BOOLEAN DEFAULT FALSE,
    role            VARCHAR(20) DEFAULT 'customer', -- customer, instructor, admin
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP,
    
    -- Indexes
    CONSTRAINT chk_role CHECK (role IN ('customer', 'instructor', 'admin'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);
```

### 2. COURSES

Master course catalog.

```sql
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL, -- handgun, rifle, ccw, security
    description     TEXT,
    short_desc      VARCHAR(500),
    
    -- Pricing
    price           DECIMAL(10, 2) NOT NULL,
    member_price    DECIMAL(10, 2),
    
    -- Details
    duration_hours  INTEGER NOT NULL,
    max_capacity    INTEGER DEFAULT 12,
    min_age         INTEGER DEFAULT 18,
    skill_level     VARCHAR(20), -- beginner, intermediate, advanced
    
    -- Requirements
    prerequisites   TEXT[], -- Array of course slugs
    gear_required   TEXT[],
    gear_provided   TEXT[],
    ammo_count      INTEGER,
    
    -- Media
    image_url       VARCHAR(500),
    thumbnail_url   VARCHAR(500),
    
    -- Status
    is_active       BOOLEAN DEFAULT TRUE,
    is_featured     BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_active ON courses(is_active);
```

### 3. INSTRUCTORS

Instructor profiles.

```sql
CREATE TABLE instructors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    bio             TEXT,
    title           VARCHAR(100),
    photo_url       VARCHAR(500),
    credentials     TEXT[],
    specialties     TEXT[],
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. SCHEDULE

Class schedule instances.

```sql
CREATE TABLE schedule (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id) NOT NULL,
    instructor_id   UUID REFERENCES instructors(id),
    
    -- Date/Time
    start_datetime  TIMESTAMP NOT NULL,
    end_datetime    TIMESTAMP NOT NULL,
    
    -- Location
    location_name   VARCHAR(100) NOT NULL,
    location_addr   VARCHAR(255),
    
    -- Capacity
    max_capacity    INTEGER NOT NULL,
    spots_filled    INTEGER DEFAULT 0,
    
    -- Status
    status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled, full, cancelled
    
    -- Pricing Override
    price_override  DECIMAL(10, 2),
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_schedule_status CHECK (status IN ('scheduled', 'full', 'cancelled', 'completed'))
);

CREATE INDEX idx_schedule_date ON schedule(start_datetime);
CREATE INDEX idx_schedule_course ON schedule(course_id);
CREATE INDEX idx_schedule_status ON schedule(status);
```

### 5. ORDERS

Customer orders/transactions.

```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    VARCHAR(20) UNIQUE NOT NULL, -- MDI-2025-XXXXX
    user_id         UUID REFERENCES users(id),
    
    -- Guest checkout
    guest_email     VARCHAR(255),
    guest_name      VARCHAR(200),
    guest_phone     VARCHAR(20),
    
    -- Financials
    subtotal        DECIMAL(10, 2) NOT NULL,
    tax_amount      DECIMAL(10, 2) NOT NULL,
    tax_rate        DECIMAL(4, 4) DEFAULT 0.0600, -- 6% WV
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    promo_code      VARCHAR(50),
    total           DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    payment_status  VARCHAR(20) DEFAULT 'pending',
    payment_method  VARCHAR(50), -- card, crypto
    payment_ref     VARCHAR(255), -- Transaction ID from processor
    
    -- Order Status
    status          VARCHAR(20) DEFAULT 'pending',
    
    -- Billing Info
    billing_name    VARCHAR(200),
    billing_address VARCHAR(255),
    billing_city    VARCHAR(100),
    billing_state   VARCHAR(2),
    billing_zip     VARCHAR(10),
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partial_refund')),
    CONSTRAINT chk_order_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at);
```

### 6. ORDER_ITEMS

Individual items within an order.

```sql
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID REFERENCES orders(id) NOT NULL,
    schedule_id     UUID REFERENCES schedule(id) NOT NULL,
    
    -- Participant (may differ from purchaser)
    participant_id  UUID REFERENCES users(id),
    participant_name VARCHAR(200),
    participant_email VARCHAR(255),
    participant_dob DATE,
    
    -- Pricing
    unit_price      DECIMAL(10, 2) NOT NULL,
    quantity        INTEGER DEFAULT 1,
    
    -- Status
    status          VARCHAR(20) DEFAULT 'registered',
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_item_status CHECK (status IN ('registered', 'attended', 'no_show', 'cancelled'))
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_schedule ON order_items(schedule_id);
```

### 7. WAIVERS

Signed liability waivers.

```sql
CREATE TABLE waivers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    order_item_id   UUID REFERENCES order_items(id),
    
    -- Waiver Content
    waiver_version  VARCHAR(20) NOT NULL,
    waiver_text     TEXT NOT NULL,
    
    -- Signature
    signature_data  TEXT, -- Base64 encoded signature image
    signed_name     VARCHAR(200) NOT NULL,
    signed_date     TIMESTAMP NOT NULL,
    
    -- Verification
    ip_address      INET,
    user_agent      TEXT,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waivers_user ON waivers(user_id);
```

### 8. ID_VERIFICATIONS

Government ID uploads for age verification.

```sql
CREATE TABLE id_verifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    
    -- Document
    document_type   VARCHAR(50), -- drivers_license, state_id, passport
    file_url        VARCHAR(500) NOT NULL, -- Encrypted S3 URL
    file_hash       VARCHAR(64), -- SHA-256 for integrity
    
    -- Verification
    verified        BOOLEAN DEFAULT FALSE,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMP,
    
    -- Metadata
    expires_at      TIMESTAMP NOT NULL, -- Auto-delete after 30 days
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_id_verifications_user ON id_verifications(user_id);
CREATE INDEX idx_id_verifications_expires ON id_verifications(expires_at);
```

### 9. CHURCH_INQUIRIES

B2B leads from church security program.

```sql
CREATE TABLE church_inquiries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization
    org_name        VARCHAR(200) NOT NULL,
    org_type        VARCHAR(50), -- church, business, school
    denomination    VARCHAR(100),
    avg_attendance  INTEGER,
    
    -- Contact
    contact_name    VARCHAR(200) NOT NULL,
    contact_role    VARCHAR(100),
    contact_email   VARCHAR(255) NOT NULL,
    contact_phone   VARCHAR(20),
    
    -- Location
    address         VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(2),
    zip_code        VARCHAR(10),
    
    -- Inquiry Details
    has_security_team BOOLEAN DEFAULT FALSE,
    team_size       INTEGER,
    budget_range    VARCHAR(50),
    timeline        VARCHAR(50),
    services_needed TEXT[],
    message         TEXT,
    
    -- Lead Status
    status          VARCHAR(20) DEFAULT 'new',
    assigned_to     UUID REFERENCES users(id),
    notes           TEXT,
    
    -- Source Tracking
    utm_source      VARCHAR(100),
    utm_medium      VARCHAR(100),
    utm_campaign    VARCHAR(100),
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_inquiry_status CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'nurture'))
);

CREATE INDEX idx_church_inquiries_status ON church_inquiries(status);
CREATE INDEX idx_church_inquiries_created ON church_inquiries(created_at);
```

### 10. PROMO_CODES

Discount codes and promotions.

```sql
CREATE TABLE promo_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    
    -- Discount
    discount_type   VARCHAR(20) NOT NULL, -- percent, fixed
    discount_value  DECIMAL(10, 2) NOT NULL,
    
    -- Restrictions
    min_order       DECIMAL(10, 2),
    max_uses        INTEGER,
    uses_per_user   INTEGER DEFAULT 1,
    current_uses    INTEGER DEFAULT 0,
    
    -- Validity
    valid_from      TIMESTAMP,
    valid_until     TIMESTAMP,
    
    -- Course Restrictions
    course_ids      UUID[], -- Empty = all courses
    
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_discount_type CHECK (discount_type IN ('percent', 'fixed'))
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
```

### 11. BLOG_POSTS

Intel/Blog content management.

```sql
CREATE TABLE blog_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(255) UNIQUE NOT NULL,
    title           VARCHAR(255) NOT NULL,
    excerpt         VARCHAR(500),
    content         TEXT NOT NULL,
    
    -- Author
    author_id       UUID REFERENCES users(id),
    
    -- Categorization
    category        VARCHAR(50),
    tags            TEXT[],
    
    -- Media
    featured_image  VARCHAR(500),
    
    -- Publishing
    status          VARCHAR(20) DEFAULT 'draft',
    published_at    TIMESTAMP,
    
    -- SEO
    meta_title      VARCHAR(60),
    meta_desc       VARCHAR(160),
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_blog_status CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);
```

### 12. NEWSLETTER_SUBSCRIBERS

Email list management.

```sql
CREATE TABLE newsletter_subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    first_name      VARCHAR(100),
    
    -- Preferences
    interests       TEXT[], -- ccw, rifle, church_security, etc.
    
    -- Status
    status          VARCHAR(20) DEFAULT 'active',
    confirmed       BOOLEAN DEFAULT FALSE,
    confirm_token   VARCHAR(255),
    
    -- Tracking
    source          VARCHAR(100),
    ip_address      INET,
    
    subscribed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    
    CONSTRAINT chk_subscriber_status CHECK (status IN ('active', 'unsubscribed', 'bounced'))
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_status ON newsletter_subscribers(status);
```

---

## Database Maintenance

### Automated Jobs

```sql
-- Delete expired ID verifications (run daily)
DELETE FROM id_verifications 
WHERE expires_at < CURRENT_TIMESTAMP;

-- Update schedule status for past classes
UPDATE schedule 
SET status = 'completed' 
WHERE end_datetime < CURRENT_TIMESTAMP 
AND status = 'scheduled';

-- Update order_items for no-shows (run day after class)
UPDATE order_items 
SET status = 'no_show' 
WHERE schedule_id IN (
    SELECT id FROM schedule 
    WHERE end_datetime < CURRENT_TIMESTAMP - INTERVAL '12 hours'
)
AND status = 'registered';
```

### Backup Strategy

- **Daily:** Full database backup to encrypted S3
- **Hourly:** Transaction log backups
- **Retention:** 30 days daily, 7 days hourly
- **Testing:** Monthly restore test to staging environment

---

## Security Considerations

1. **Encryption at Rest:** All PII fields encrypted using pgcrypto
2. **ID Documents:** Stored in encrypted S3 with IAM restrictions
3. **Payment Data:** Never stored; handled by payment processor
4. **Access Logging:** All admin queries logged for audit trail
5. **Row-Level Security:** Customers can only access their own data

---

## API Endpoints (Reference)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses` | GET | List all active courses |
| `/api/schedule` | GET | Get upcoming classes |
| `/api/orders` | POST | Create new order |
| `/api/orders/:id` | GET | Get order details |
| `/api/user/profile` | GET/PUT | User profile |
| `/api/church-inquiry` | POST | Submit B2B inquiry |

---

## Migration Notes

When implementing this schema:

1. Start with users, courses, instructors tables
2. Add schedule and orders for MVP
3. Implement waivers before accepting payments
4. ID verification can be phase 2
5. Blog/newsletter can be phase 3

---

*Document Version: 1.0*
*Last Updated: January 2025*
