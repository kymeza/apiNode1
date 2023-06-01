const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bodyParser = require('body-parser');

//Creamos una BaseDatos SQLite en memoria para testear
let db = new sqlite3.Database(':memory:');

//leemos el archivo secret.txt que actuará como sal para las contraseñas posteriores
/*
var salt;
fs.readFile('secret.txt', 'utf-8', (err,data) => {
    if (err){
        console.log('Error: ', err);
        return;
    }
    salt = data.trim();
    process.env["salt"] = salt;
});
console.log(process.env.salt);
*/

var data = fs.readFileSync("secret.txt", "utf-8");
data.trim();
process.env["salt"] = data;
console.log(process.env.salt);

//creamos la variable ambiente que contiene la sal antes leida


//inicializamos la base de datos
db.serialize(function() {
    db.run("CREATE TABLE users (name TEXT, email TEXT, password TEXT)");
    db.run("INSERT INTO users (name, email, password) VALUES ('admin','admin@admin.cl','bd816339fa5c58cf528f29361b9a61aec59b88e55b3e0e0b91d15762ba128181')")
    //INFO: database created, with example users
});

//TO-DO: Implementar Logging (Logs)
//TO-DO: Implementar SSL (HTTPS)


//inicializamos la app con Express
let app = express(); 
app.use(bodyParser.json());
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));



//Definimos metodo GET en endpoint /users para probar la API en cuestion
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

//Definir metodo POST en endpoint /users para crear usuarios mediante la API
app.post('/users', (req, res) => {
    let sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    if(req.body) {
        //Leer el body del Request y ESCAPAR LOS CARACTERES ESPECIALES
        //PARAMETRIZAR LA QUERY
        //UTILIZAR LIBREARIAS PARA CONSULTAS SIN QUERYS
        let user_name = req.body.name;
        let email = req.body.email;
        let password = req.body.password;
        
        //let query = "".concat( sql, '(' , user_name, ',' , email , ',' , password ,');' );
        
        db.run(sql, [user_name, email, password], (err) => {
            if(err){
                res.status(400).json({"Error":"Bad Request","callback":err.message});
            }
            res.status(201).end();
        });
        return;
    }
    res.status(400).json({"Error":"Bad Request"});
});

app.get('/usersView', (req, res) => {
    db.all("SELECT name, email FROM users",(err, rows) => {
        if(err) {
            res.status(500).json({"Error":"Internal Server Error"});
            return;
        }
        res.render('users', {users: rows});
    });
});



//Dejamos correr la App en el puerto 9000 (HTTP) no encriptado.
app.listen(9000);

