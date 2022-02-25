INSERT INTO species (name, scientific_name) VALUES
('White-breasted Waterhen','Amaurornis phoenicurus'),
('Zebra Dove','Geopelia striata'),
('Spotted Dove',' Spilopelia chinensis');

INSERT INTO behaviours (name) VALUES ('pooping'), ('long song'), ('pecking'), ('perched'), ('hovering'), ('preening');

INSERT INTO users (email, password) VALUES ('a@aa', '123');

INSERT INTO notes (user_id, date_time, species_id, flock_size)
VALUES (1, '2022-02-21 13:14:00+08', 2, 1);

INSERT INTO notes_behaviours (note_id,behaviour_id) VALUES (1,2), (1,5);

INSERT INTO comments (note_id, content, created_on, posted_by) VALUES (1, 'Howdy do~ This is a longer comment just to see how it would look like on the notes page. Wondering how it would turn out... Great site btw', CURRENT_TIMESTAMP, 1);