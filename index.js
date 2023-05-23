const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bodyParser = require('body-parser');

let db = new sqlite3.Database(':memory:');

var salt;

fs.readFile('secret.txt', 'utf-8', (err,data) => {
    if (err){
        console.log('Error: ', err);
        return;
    }
    salt = data;
});

process.env["salt"] = salt;

db.serialize(function() {
    db.run("CREATE TABLE users (name TEXT, email TEXT, password TEXT)");
    db.run("INSERT INTO users (name, email, password) VALUES ('admin','admin@admin.cl','bd816339fa5c58cf528f29361b9a61aec59b88e55b3e0e0b91d15762ba128181')")
    //INFO: database created, with example users
});

//TO-DO: Implementar Logging (Logs)

let app = express(); 

app.use(bodyParser.json());

app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', function(err, rows) {
        if(err) {
            res.status(500).json({"Error":"Internal Server Error"});
            return;
        }
        res.json({
            "message" : "success",
            "data": rows
        });
    });
});

//INFO: App Running in Port 9000
app.listen(9000);

