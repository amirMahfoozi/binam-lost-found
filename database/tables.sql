--Table creation

CREATE TABLE users (
  uid SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  username TEXT not NULL,
  registeration_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otps (
  oid SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE items (
  iid SERIAL PRIMARY KEY,
  uid INTEGER REFERENCES users(uid) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('lost', 'found')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  add_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags (
  tid SERIAL PRIMARY KEY,
  tagname TEXT UNIQUE NOT NULL,
  color TEXT
);

CREATE TABLE item_tags (
  iid INTEGER REFERENCES items(iid) ON DELETE CASCADE,
  tid INTEGER REFERENCES tags(tid) ON DELETE CASCADE,
  PRIMARY KEY (iid, tid)
);

CREATE TABLE images (
  imid SERIAL PRIMARY KEY,
  iid INTEGER REFERENCES items(iid) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  cid SERIAL PRIMARY KEY,
  iid INTEGER REFERENCES items(iid) ON DELETE CASCADE,
  uid INTEGER REFERENCES users(uid) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  report_count INTEGER DEFAULT 0,
  date_added TIMESTAMP DEFAULT NOW()
);


--Indexing

	--ordering by date
CREATE INDEX idx_items_add_date
ON items(add_date DESC);

	--filter by type
CREATE INDEX idx_items_type
ON items(type);

	--filter by tags
CREATE INDEX idx_item_tags_tid
ON item_tags(tid);

CREATE INDEX idx_item_tags_iid
ON item_tags(iid);

	--comments for an item
CREATE INDEX idx_comments_iid
ON comments(iid);

	--location filter
CREATE INDEX idx_items_lat_lng
ON items(latitude, longitude);

	--email otps
CREATE INDEX idx_otps_email
ON otps(email);




