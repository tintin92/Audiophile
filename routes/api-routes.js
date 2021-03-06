// Requiring our models and passport as we've configured it
const db = require("../models");
const passport = require("../config/passport");
const axios = require("axios");
const isAuthenticated = require("../config/middleware/isAuthenticated");
const { Op } = require("sequelize");

module.exports = function(app) {
  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Sending back a password, even a hashed password, isn't a good idea
    res.json({
      email: req.user.email,
      id: req.user.id
    });
  });

  // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
  // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
  // otherwise send back an error
  app.post("/api/signup", (req, res) => {
    db.User.create({
      email: req.body.email,
      password: req.body.password
    })
      .then(() => {
        res.redirect(307, "/api/login");
      })
      .catch(err => {
        res.status(401).json(err);
      });
  });

  // Route for logging user out
  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  // Route for getting some data about our user to be used client side
  app.get("/api/user_data", (req, res) => {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      res.json({
        email: req.user.email,
        id: req.user.id
      });
    }
  });

  // ================ Artist Search ================

  app.get("/api/searchArtist/:artistName", (req, res) => {
    const options = {
      method: "GET",
      url: "https://rapidapi.p.rapidapi.com/search.php",
      params: { s: req.params.artistName },
      headers: {
        "x-rapidapi-host": "theaudiodb.p.rapidapi.com",
        "x-rapidapi-key": process.env.API_KEY
      }
    };

    axios
      .request(options)
      .then(response => {
        const artist = response.data.artists[0];

        res.json(artist);
      })
      .catch(error => {
        console.error(error);
      });
  });

  app.get("/api/artist/:artistName", (req, res) => {
    const options = {
      method: "GET",
      url: "https://theaudiodb.p.rapidapi.com/track-top10.php",
      params: { s: req.params.artistName },
      headers: {
        "x-rapidapi-host": "theaudiodb.p.rapidapi.com",
        "x-rapidapi-key": process.env.API_KEY
      }
    };

    axios
      .request(options)
      .then(response => {
        const artistSongs = response.data.track;

        res.json(artistSongs);
      })
      .catch(error => {
        console.error(error);
      });
  });

  // ============= Song Search ========================

  app.get("/api/searchSong/:id", (req, res) => {
    const options = {
      method: "GET",
      url: "https://theaudiodb.p.rapidapi.com/track.php",
      params: { h: req.params.id },
      headers: {
        "x-rapidapi-host": "theaudiodb.p.rapidapi.com",
        "x-rapidapi-key": process.env.API_KEY
      }
    };

    axios
      .request(options)
      .then(response => {
        const song = response.data.track[0];

        res.json(song);
      })
      .catch(error => {
        console.error(error);
      });
  });

  // ================ Index Page ================

  app.get("/api/top20", (req, res) => {
    const options = {
      method: "GET",
      url: "https://theaudiodb.p.rapidapi.com/mostloved.php",
      params: { format: "track" },
      headers: {
        "x-rapidapi-host": "theaudiodb.p.rapidapi.com",
        "x-rapidapi-key": process.env.API_KEY
      }
    };

    axios
      .request(options)
      .then(response => {
        const topSongs = response.data.loved;

        res.json(topSongs);
      })
      .catch(error => {
        console.error(error);
      });
  });

  // ================ Members Page Table Data ================
  app.post("/api/favoriteSong", isAuthenticated, (req, res) => {
    let check;
    db.favoriteSong
      .findAll({
        where: {
          [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
        }
      })
      .then(response => {
        check = response;
        if (check.length === 0) {
          db.favoriteSong
            .create({
              song: req.body.song,
              songName: req.body.songName,
              userId: req.user.id,
              later: 0
            })
            .then(() => {
              res.redirect("/members");
            })
            .catch(err => {
              res.status(401).json(err);
            });
        } else {
          res.redirect("/members");
        }
      });
  });

  app.post("/api/favoriteSongLater", isAuthenticated, (req, res) => {
    let check;
    db.favoriteSong
      .findAll({
        where: {
          [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
        }
      })
      .then(response => {
        check = response;
        if (check.length === 0) {
          db.favoriteSong
            .create({
              song: req.body.song,
              songName: req.body.songName,
              userId: req.user.id,
              later: 1
            })
            .then(() => {
              res.redirect("/members");
            })
            .catch(err => {
              res.status(401).json(err);
            });
        } else {
          res.redirect("/members");
        }
      });
  });

  app.post("/api/favoriteArtist", isAuthenticated, (req, res) => {
    let check;
    db.favoriteArtist
      .findAll({
        where: {
          [Op.and]: [{ artist: req.body.artist }, { userId: req.user.id }]
        }
      })
      .then(response => {
        check = response;
        if (check.length === 0) {
          db.favoriteArtist
            .create({
              artist: req.body.artist,
              userId: req.user.id
            })
            .then(() => {
              res.redirect("/members");
            })
            .catch(err => {
              res.status(401).json(err);
            });
        } else {
          res.redirect("/members");
        }
      });
  });

  app.post("/api/deleteArtist", (req, res) => {
    db.favoriteArtist
      .destroy({
        where: {
          [Op.and]: [{ artist: req.body.artist }, { userId: req.user.id }]
        }
      })
      .then(() => {
        res.redirect("/members");
      });
  });

  app.post("/api/deleteSong", (req, res) => {
    db.favoriteSong
      .destroy({
        where: {
          [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
        }
      })
      .then(() => {
        res.redirect("/members");
      });
  });

  app.post("/api/deleteSongLater", (req, res) => {
    db.favoriteSong
      .destroy({
        where: {
          [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
        }
      })
      .then(() => {
        res.redirect("/members");
      });
  });

  app.post("/api/updateSong", (req, res) => {
    db.favoriteSong
      .update(
        {
          later: 1
        },
        {
          where: {
            [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
          }
        }
      )
      .then(() => {
        res.redirect("/members");
      });
  });

  app.post("/api/updateSongLater", (req, res) => {
    db.favoriteSong
      .update(
        {
          later: 0
        },
        {
          where: {
            [Op.and]: [{ song: req.body.song }, { userId: req.user.id }]
          }
        }
      )
      .then(() => {
        res.redirect("/members");
      });
  });

  // ================ Members Page Appending ================
  app.get("/api/savedArtists", (req, res) => {
    db.favoriteArtist
      .findAll({
        where: {
          userId: req.user.id
        }
      })
      .then(data => {
        res.json(data);
      });
  });

  app.get("/api/savedSongs", (req, res) => {
    db.favoriteSong
      .findAll({
        where: {
          userId: req.user.id
        }
      })
      .then(data => {
        res.json(data);
      });
  });

  app.get("/api/savedSongsLater", (req, res) => {
    db.favoriteSong
      .findAll({
        where: {
          userId: req.user.id
        }
      })
      .then(data => {
        res.json(data);
      });
  });
};
