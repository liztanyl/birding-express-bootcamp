import express from 'express';
import pg from 'pg';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';

// Initialise express
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Initialise pool for Postgres
const { Pool } = pg;
const pgConfigs = {
  user: 'liztanyl',
  host: 'localhost',
  database: 'birding',
  port: 5432,
};

const pool = new Pool(pgConfigs);

const dateOptions = {
  weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
};

// ########## CALLBACK FUNCTIONS ##########
// -------------
// GET callbacks
// -------------

// Render index page ('/')
const renderIndexPage = (req, res) => {
  const userId = [req.cookies.userId];
  const query = `
    SELECT notes.id, date_time, species.name AS species, flock_size
    FROM notes
    INNER JOIN species
    ON notes.species_id=species.id
    WHERE notes.user_id=$1;
  `;
  pool.query(query, userId, (err, result) => {
    if (err) console.log(err);

    const data = result.rows;
    data.forEach((note) => {
      note.date_time = note.date_time.toLocaleString('en-SG', dateOptions);
    });
    const content = { notes: data };
    // console.log(content);
    res.render('home-page', content);
  });
};

// Render form to create a new note ('/note')
const renderNewNoteForm = (req, res) => {
  const isUserLoggedIn = req.cookies.login;
  if (!isUserLoggedIn) {
    res.status(403).redirect('/login');
    return;
  }
  pool.query('SELECT * FROM species;', (_, result) => {
    pool.query('SELECT * FROM behaviours;', (_, result2) => {
      const data = { species: result.rows, behaviours: result2.rows };
      res.render('new-note-form', data);
    });
  });
};

const showNoteById = (req, res) => {
  const noteIdData = [req.params.id];
  const query = `
    SELECT date_time, species.name AS species, flock_size
    FROM notes
    INNER JOIN species
    ON notes.species_id=species.id
    WHERE notes.id=$1;
  `;

  pool.query(query, noteIdData, (err, result) => {
    if (err) {
      console.log('Error: ', err);
      return;
    }

    const data = result.rows[0];
    data.date_time = data.date_time.toLocaleString('en-SG', dateOptions); // Format date & time

    const behavioursQuery = `
    SELECT behaviours.name
    FROM behaviours
    INNER JOIN notes_behaviours
    ON notes_behaviours.behaviour_id=behaviours.id
    WHERE note_id=$1;
    `;

    pool.query(behavioursQuery, noteIdData, (errB, resultB) => {
      // Add each behaviour to the data object, save as concatenated string
      data.behaviours = resultB.rows.map((behaviour) => behaviour.name).join(', ');
      data.id = noteIdData;

      const commentsQuery = `
        SELECT content, created_on, users.email AS user
        FROM comments
        INNER JOIN users
        ON comments.posted_by=users.id
        WHERE note_id=$1;
      `;

      pool.query(commentsQuery, noteIdData, (_, resultC) => {
        if (!resultC) {
          data.comments = [];
        } else {
          resultC.rows.forEach((comment) => {
            comment.created_on = comment.created_on.toLocaleString('en-SG', dateOptions);
          });
          data.comments = resultC.rows;
        }
        res.render('note', data);
      });
    });
  });
};

// Render form to create new user
const renderUserSignupForm = (req, res) => {
  res.render('user-signup');
};

// Render login page
const renderLoginPage = (req, res) => {
  res.render('user-login');
};

// --------------
// POST callbacks
// --------------
// Submit a new note
const submitNewNoteForm = (req, res) => {
  const isUserLoggedIn = req.cookies.login;
  if (!isUserLoggedIn) {
    res.status(403).redirect('/login');
    return;
  }
  // formData stores: userId, date_time, species_id, flock_size
  const formData = [req.cookies.userId,
    req.body.date_time,
    req.body.species_id,
    req.body.flock_size];
  const query = 'INSERT INTO notes (user_id, date_time, species_id, flock_size) VALUES ($1, $2, $3, $4) RETURNING id;';
  pool.query(query, formData, (err, result) => {
    if (err) {
      console.log('Error submitting note', err.stack);
      return;
    }

    const { id } = result.rows[0]; // Get id of new note entry
    const behaviours = [...req.body.behaviour_ids]; // Get array of behaviour_ids
    console.log(behaviours);
    let queryCounter = 0;

    behaviours.forEach((behaviour) => {
      const behaviourData = [id, behaviour];
      pool.query('INSERT INTO notes_behaviours (note_id, behaviour_id) VALUES ($1, $2)', behaviourData, (errB, resultB) => {
        if (errB) {
          console.log('Error adding behaviour', errB.stack);
          return;
        }
        console.log(resultB.rows);
        queryCounter += 1;

        if (queryCounter === behaviours.length) {
          res.redirect(`/note/${id}`);
        }
      });
    });
  });
};

// Submit comment
const submitCommentForm = (req, res) => {
  const formData = [req.params.id, req.body.content, req.cookies.userId];
  const query = `
    INSERT INTO comments (note_id, content, created_on, posted_by) VALUES ($1, $2, CURRENT_TIMESTAMP, $3);
  `;
  pool.query(query, formData, (err) => {
    if (err) console.log('error submitting comment', err);
    res.redirect(`/note/${req.params.id}`);
  });
};

// Create a new user
const newUserSignup = (req, res) => {
  // eslint-disable-next-line new-cap
  // const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
  // shaObj.update(req.body.password);
  // const hashedPassword = shaObj.getHash('HEX');
  // const formData = [req.body.email, hashedPassword];
  const formData = [req.body.email, req.body.password];
  const query = 'INSERT INTO users (email, password) VALUES ($1, $2);';
  pool.query(query, formData, (err, result) => {
    if (err) {
      console.log('Error creating new user', err.stack);
      return;
    }
    console.log(result.rows);
    res.redirect('/login');
  });
};

// Handle login
const handleUserLogin = (req, res) => {
  const loginData = [req.body.email];
  const query = 'SELECT * FROM users WHERE email=$1;';
  pool.query(query, loginData, (err, result) => {
    if (err) {
      console.log('Error logging in', err.stack);
    }
    if (result.rows.length === 0) {
      res.cookie('login=false;');
      res.status(403).send('Login fail');
      return;
    }
    const { id, password } = result.rows[0];
    // eslint-disable-next-line new-cap
    // const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    // shaObj.update(req.body.password);
    // const hashedEnteredPassword = shaObj.getHash('HEX');
    if (req.body.password === password) {
      res.cookie('login=true;');
      res.cookie(`userId=${id};`);
      res.redirect('/');
    } else {
      res.cookie('login=false;');
      res.status(403).send('Login fail');
    }
    //
  });
};
// Handle logout
const handleUserLogout = (req, res) => {
  res.clearCookie('login').clearCookie('userId').redirect('/');
};

// ################ ROUTES ################
app.get('/', renderIndexPage);
app.get('/note', renderNewNoteForm);
app.get('/note/:id', showNoteById);
app.get('/signup', renderUserSignupForm);
app.get('/login', renderLoginPage);
app.get('/logout', handleUserLogout);

app.post('/note', submitNewNoteForm);
app.post('/note/:id/comment', submitCommentForm);
app.post('/signup', newUserSignup);
app.post('/login', handleUserLogin);

app.listen(3004);
