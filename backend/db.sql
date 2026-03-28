-- =========================================
-- TABLA CATEGORY
-- =========================================
CREATE TABLE IF NOT EXISTS category (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(250),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =========================================
-- TABLA PRODUCT
-- =========================================
CREATE TABLE IF NOT EXISTS product (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(250) NOT NULL,
    category VARCHAR(100),
    stock INT NOT NULL CHECK (stock >= 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_product_deleted_at ON product (deleted_at);

-- =========================================
-- TABLA SOLDPRODUCT
-- =========================================
CREATE TABLE IF NOT EXISTS soldProduct (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_name VARCHAR(250),
    sales INT NOT NULL CHECK (sales > 0),
    category VARCHAR(250) NOT NULL,
    sold_at TIMESTAMP WITH TIME ZONE,
    price NUMERIC(10, 2) NOT NULL,
    product_id INT NOT NULL,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES product (id)
);

CREATE INDEX IF NOT EXISTS idx_soldproduct_sold_at ON soldProduct (sold_at);

CREATE INDEX IF NOT EXISTS idx_soldproduct_productid ON soldProduct (product_id);

-- =========================================
-- TABLA DEVICE
-- =========================================
CREATE TABLE IF NOT EXISTS device (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_name VARCHAR(250),
    number_phone VARCHAR(20) CHECK (
        number_phone ~ '^\+?[0-9]{7,15}$'
    ),
    device VARCHAR(250),
    model VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    price_pay NUMERIC(10, 2) CHECK (price_pay >= 0),
    detail VARCHAR(400),
    faults JSONB,
    repair_status VARCHAR(25) NOT NULL DEFAULT 'En Revisión' CHECK (
        repair_status IN (
            'Reparado',
            'Sin Solución',
            'En Revisión'
        )
    ),
    pay BOOLEAN NOT NULL DEFAULT false,
    output_status BOOLEAN NOT NULL DEFAULT false,
    imei VARCHAR(15) CHECK (length(imei) = 15),
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_date TIMESTAMP WITH TIME ZONE,
    warrant_limit TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pay_consistency_check CHECK (
        (
            (pay = true)
            AND (price_pay IS NOT NULL)
            AND (price_pay >= price)
        )
        OR (pay = false)
    )
);

-- =========================================
-- FUNCIÓN TRIGGER
-- =========================================
CREATE
OR REPLACE FUNCTION set_pay_status() RETURNS TRIGGER AS $$ BEGIN IF NEW.repair_status = 'Reparado'
AND NEW.price_pay IS NOT NULL
AND NEW.price_pay >= NEW.price THEN NEW.pay := true;

ELSE NEW.pay := false;

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

-- =========================================
-- TRIGGER
-- =========================================

CREATE TRIGGER trigger_device_pay BEFORE
INSERT
      OR
UPDATE
      ON device FOR EACH ROW EXECUTE FUNCTION set_pay_status();

-- =========================================
-- TABLA HISTORYTICKET
-- =========================================
CREATE TABLE IF NOT EXISTS historyTicket (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id INT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    spare_parts JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES device (id)
);

CREATE INDEX IF NOT EXISTS idx_history_spare_parts ON historyTicket USING GIN (spare_parts);

-- =========================================
-- CATEGORÍAS POR DEFECTO
-- =========================================
DELETE FROM category
WHERE
    name IN (
        'electrónica',
        'repuestos',
        'accesorios',
        'software',
        'servicios'
    );

INSERT INTO
    category (name)
VALUES ('electrónica'),
    ('repuestos'),
    ('accesorios'),
    ('software'),
    ('servicios');