const { db } = require("../util/admin");

exports.getAllShuttles = (req, res) => {
  db.collection("shuttles")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let shuttles = [];
      data.forEach(doc => {
        shuttles.push({
          shuttleId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(shuttles);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postOneShuttle = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newShuttle = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection("shuttles")
    .add(newShuttle)
    .then(doc => {
      const resShuttle = newShuttle;
      resShuttle.shuttleId = doc.id;
      res.json(resShuttle);
    })
    .catch(err => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};
//! Fetch only one shuttle
exports.getShuttle = (req, res) => {
  let shuttleData = {};
  db.doc(`/shuttles/${req.params.shuttleId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Shuttle not found" });
      }
      shuttleData = doc.data();
      shuttleData.shuttleId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("shuttleId", "==", req.params.shuttleId)
        .get();
    })
    .then(data => {
      shuttleData.comments = [];
      data.forEach(doc => {
        shuttleData.comments.push(doc.data());
      });
      return res.json(shuttleData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Comment on a comment
exports.commentOnShuttle = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    shuttleId: req.params.shuttleId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  console.log(newComment);

  db.doc(`/shuttles/${req.params.shuttleId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Shuttle not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};
//! Like a shuttle post
exports.likeShuttle = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("shuttleId", "==", req.params.shuttleId)
    .limit(1);

  const shuttleDocument = db.doc(`/shuttles/${req.params.shuttleId}`);

  let shuttleData;

  shuttleDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        shuttleData = doc.data();
        shuttleData.shuttleId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Shuttle not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            shuttleId: req.params.shuttleId,
            userHandle: req.user.handle
          })
          .then(() => {
            shuttleData.likeCount++;
            return shuttleDocument.update({ likeCount: shuttleData.likeCount });
          })
          .then(() => {
            return res.json(shuttleData);
          });
      } else {
        return res
          .status(400)
          .json({ error: "Shuttle has been already liked" });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//! Unlike a shuttle post
exports.unlikeShuttle = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("shuttleId", "==", req.params.shuttleId)
    .limit(1);

  const shuttleDocument = db.doc(`/shuttles/${req.params.shuttleId}`);

  let shuttleData;

  shuttleDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        shuttleData = doc.data();
        shuttleData.shuttleId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Shuttle not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return res.status(400).json({ error: "Shuttle not liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            shuttleData.likeCount--;
            return shuttleDocument.update({ likeCount: shuttleData.likeCount });
          })
          .then(() => {
            res.json(shuttleData);
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//! Delete a shuttle post #toxic
exports.deleteShuttle = (req, res) => {
  const document = db.doc(`/shuttles/${req.params.shuttleId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Shuttle not found" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Shuttle deleted successfully" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
