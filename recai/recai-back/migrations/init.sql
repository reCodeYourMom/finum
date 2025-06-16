CREATE TABLE clone (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE TABLE script (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE TABLE video_project (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE TABLE look (
	id VARCHAR NOT NULL, 
	clone_id VARCHAR NOT NULL, 
	video_source_path VARCHAR NOT NULL, 
	face_path VARCHAR NOT NULL, 
	decor_context VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(clone_id) REFERENCES clone (id)
);

CREATE TABLE voice (
	id VARCHAR NOT NULL, 
	clone_id VARCHAR NOT NULL, 
	language VARCHAR NOT NULL, 
	emotions JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(clone_id) REFERENCES clone (id)
);

