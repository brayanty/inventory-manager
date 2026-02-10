CREATE TABLE product (             
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(250) NOT NULL,
  category VARCHAR(100),
  stock INT NOT NULL CHECK (stock >= 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  deleted_at TIMESTAMP WITH TIME ZONE
);

INSERT INTO product (name,category,price,stock) VALUES('nosenn','display',10000,100);

-- DROP TABLE IF EXISTS product;

CREATE TABLE soldProduct (  
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clientName VARCHAR(250),
  sales INT NOT NULL CHECK (sales >= 0),
  sold_at TIMESTAMP WITH TIME ZONE,
  price INT NOT NULL,
  productID INT NOT NULL,
  CONSTRAINT fk_product
    FOREIGN KEY (productID)
    REFERENCES product(id)
);



DROP TABLE IF EXISTS soldProduct;

INSERT INTO soldProduct (sale,price,productID) VALUES(10000,500,100);



 SELECT * FROM product;



CREATE INDEX idx_soldproduct_sold_at ON soldProduct (sold_at);
CREATE INDEX idx_soldproduct_productid ON soldProduct (productID);
CREATE INDEX idx_product_deleted_at ON product (deleted_at);


-- Tableas

CREATE TABLE IF NOT EXISTS device(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_name VARCHAR(250),
    number_phone VARCHAR(20) CHECK (number_phone ~ '^\+?[0-9]{7,15}$'),
    device VARCHAR(250),
    model VARCHAR(100),
    price INT NOT NULL,
    detail VARCHAR(400),
    faults JSONB NOT NULL,
    repair_status VARCHAR(25) CHECK (repair_status IN ('Reparado', 'Sin Solución', 'En Revisión')) NOT NULL,
    pay boolean DEFAULT FALSE,
    output_status VARCHAR(5),
    price_pay INT NOT NULL,
    imei VARCHAR(15) CHECK (length(imei) = 15),
    entry_date  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_date TIMESTAMP WITH TIME ZONE,
    warrant_limit TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
)


ALTER TABLE device
ADD COLUMN IF NOT EXISTS TIMESTAMP WITH TIME ZONE;
SELECT * FROM device
DROP TABLE device