const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");
const { db } = require("./util/admin");

const {
  getAllShuttles,
  postOneShuttle,
  getShuttle,
  commentOnShuttle,
  likeShuttle,
  unlikeShuttle,
  deleteShuttle
} = require("./handlers/shuttles");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

//? Shuttle Routes <-===->
app.get("/shuttles", getAllShuttles);
app.post("/shuttle", FBAuth, postOneShuttle);
app.get("/shuttle/:shuttleId", getShuttle);
app.get("/shuttle/:shuttleId/like", FBAuth, likeShuttle);
app.get("/shuttle/:shuttleId/unlike", FBAuth, unlikeShuttle);
app.delete("/shuttle/:shuttleId", FBAuth, deleteShuttle);
app.post("/shuttle/:shuttleId/comment", FBAuth, commentOnShuttle);

//? Users Routes <-===->
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
exports.api = functions.https.onRequest(app);

exports.api = functions.region("us-central1").https.onRequest(app);

exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate(snapshot => {
    db.doc(`/shuttles/${snapshot.data().shuttleId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            shuttleId: doc.id
          });
        }
      })
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });
exports.deleteNotificationOnUnlike = functions.firestore
  .document("comments/{id}")
  .onDelete(snapshot => {
    db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate(snapshot => {
    db.doc(`/shuttles/${snapshot.data().shuttleId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            shuttleId: doc.id
          });
        }
      })
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });
