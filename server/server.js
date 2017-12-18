require('./config/config');
const express = require('express');
const bodyParser = require('body-parser');
const {MongoClient, ObjectID} = require('mongodb');
var moment = require('moment');

var app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/locations', (req, res) => {
    var lat = req.body.lat;
    var lng = req.body.lng;
    //timestamp = req.body.timestamp;
    var timestamp = moment().unix();
    var userId = req.body.userId;

    MongoClient.connect(process.env.MONGODB_URI, (err, db) => {
        if (err) {
            db.close();
            return res.status(400).send('Unable to connect to MongoDB server');
            console.log(err);
        }
        console.log('Connected to MongoDB server');

        db.collection('LocationHistory').findOneAndUpdate({
            "userId" : userId
        }, {
            $set: {
                "timestamp" : timestamp,
                "lat" : lat,
                "lng" : lng
            },
            $push: {
                "history" : {
                    "timestamp" : timestamp,
                    "lat" : lat,
                    "lng" : lng
                }
            }
        }, {
            returnOriginal: false
        }).then((result) => {
            console.log(result);
            
            if(result.lastErrorObject.updatedExisting) {
                db.close(); 
                return res.send(result);
            } else {
                db.collection('LocationHistory').insertOne({
                    "userId" : userId,
                    "timestamp" : timestamp,
                    "lat" : lat,
                    "lng" : lng,
                    "history" : [
                        {
                            "timestamp" : timestamp,
                            "lat" : lat,
                            "lng" : lng             
                        }
                    ]
                }, (err, result) => {
                    db.close();
                    if (err) {
                        return res.status(400).send('Unable to insert location');
                        console.log(result);
                    }
                    return res.send(result);                    
                });
            }
        });   
        //db.close(); // inserido acima nos devidos locais devido à assincronissidade do node
    });
});

app.get('/location/:userId/:startingTimestamp/:endingTimestamp', (req, res) => {
    var userId = ParseInt(req.params.userId);
    console.log("====> USER ID: " + userId);
    var startingTimestamp = Number(req.params.startingTimestamp);
    var endingTimestamp = Number(req.params.endingTimestamp);
    var timestamp = moment().unix();

    MongoClient.connect(process.env.MONGODB_URI, (err, db) => {
        if (err) {
            db.close();
            return res.status(400).send('Unable to connect to MongoDB server');
            console.log(err);
        }
        console.log('Connected to MongoDB server');

        db.collection('LocationHistory').findOne({
            "userId" : userId
        }, {
            "history" : true,
            "_id" : false
        }).then((result) => {
            if(!result.history) {
                return res.status(404).send("An error occurred.");
            }

            var locations = [];
            for(var i = 0; i < result.history.length; i++) {
                if(result.history[i].timestamp >= startingTimestamp && result.history[i].timestamp <= endingTimestamp) {
                      locations.push(result.history[i])
                }
            }

            console.log(locations);
            db.close();
            return res.send(locations);
        });
        //db.close(); // inserido acima nos devidos locais devido à assincronissidade do node
    });
});

app.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

module.exports = {app};