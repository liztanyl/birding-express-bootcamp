DROP TABLE IF EXISTS users, comments, notes_behaviours, notes, species, behaviours;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT
);

CREATE TABLE species (
  id SERIAL PRIMARY KEY,
  name TEXT,
  scientific_name TEXT
);

CREATE TABLE behaviours (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  date_time TIMESTAMP NOT NULL,
  species_id INTEGER,
  flock_size INTEGER,
  CONSTRAINT fk_species
		FOREIGN KEY (species_id)
			REFERENCES species(id)
);

CREATE TABLE notes_behaviours (
  id SERIAL PRIMARY KEY,
  note_id INTEGER,
  behaviour_id INTEGER,
  CONSTRAINT fk_note
		FOREIGN KEY (note_id)
			REFERENCES notes(id),
  CONSTRAINT fk_behaviour
		FOREIGN KEY (behaviour_id)
			REFERENCES behaviours(id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  note_id INTEGER,
  content TEXT,
  created_on TIMESTAMPTZ,
  posted_by INTEGER,
  CONSTRAINT fk_note
    FOREIGN KEY (note_id)
      REFERENCES notes(id),
  CONSTRAINT fk_user
    FOREIGN KEY (posted_by)
      REFERENCES users(id)
);
