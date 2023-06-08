const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bodyParser = require('body-parser');

const crypto = require('crypto');
const session = require('express-session')

//Creamos una BaseDatos SQLite en memoria para testear
let db = new sqlite3.Database(':memory:');

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const iconv = require('iconv-lite');
const { exec } = require('child_process');

const path = require('path');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });


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
process.env["salt"] = data.trim();
console.log(process.env.salt);

//creamos la variable ambiente que contiene la sal antes leida


//inicializamos la base de datos
db.serialize(function() {
    db.run("CREATE TABLE users (name TEXT, email TEXT, password TEXT)");
    db.run("INSERT INTO users (name, email, password) VALUES ('admin','admin@admin.cl','bd816339fa5c58cf528f29361b9a61aec59b88e55b3e0e0b91d15762ba128181')")
    db.run("INSERT INTO users (name, email, password) VALUES ('admin','admin@admin.cl','dd4a30a8817fecab6f97e10935e0917bea51a5325ab6222e074b7d5922408eaa')")
    //INFO: database created, with example users
});

//TO-DO: Implementar Logging (Logs)
//TO-DO: Implementar SSL (HTTPS)


//inicializamos la app con Express
let app = express(); 
app.use(bodyParser.json());
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(session({
    secret: process.env.salt,
    resave: false,
    cookie: {secure: false},
}));

app.use((req, res, next) => {
    if (!req.session.ipAddress) {
      req.session.ipAddress = req.ip;
    }
  
    if (req.session.ipAddress !== req.ip) {
      return res.status(403).send('Session hijacking attempt detected. Session has been invalidated.');
    }
    next();
});

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

app.get('/usersView', asegurarIdentidad ,(req, res) => {
    db.all("SELECT name, email FROM users",(err, rows) => {
        if(err) {
            res.status(500).json({"Error":"Internal Server Error"});
            return;
        }
        res.render('users', {users: rows});
    });
});

app.get('/login', (req,res) => {
    res.render("login");
});

/*
app.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    let passwordConSalt = password.concat(process.env.salt);
    let hash = crypto.createHash('sha256');
    hash.update(passwordConSalt);
    let passwordHash = hash.digest('hex');

    let sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.get(sql, [email, passwordHash], (err, row) => {
        if(err) {
            res.status(500).json({"Error 500":"Internal Server Error"});
            return;
        }

        if(row) {
            req.session.email = email;
            res.redirect('/usersView');
        } else {
            res.status(400).json({"error": "Email o Contraseña no válidos"});
        }
    });
});
*/
app.post('/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    let passwordConSalt = password.concat(process.env.salt);
    let hash = crypto.createHash('sha256');
    hash.update(passwordConSalt);
    let passwordHash = hash.digest('hex');

    let sql = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.get(sql, [email, passwordHash], (err, row) => {
        if(err) {
            res.status(500).json({"Error 500":"Internal Server Error"});
            return;
        }
        if(row) {
            //Aqui creo el JWT que se le enviará al usuario.
            let token = jwt.sign(
                {'email': email},
                process.env.salt,
                {expiresIn: '1h', algorithm: 'HS256'}
            );
            res.cookie('token',token, {secure: false} );
            res.redirect('/usersView');
        } else {
            res.status(400).json({"error": "Email o Contraseña no válidos"});
        }
    });
});

/*
function asegurarIdentidad(req, res, next) {
    if (req.session.email) {
        return next();
    } else {
        res.redirect('/login');
    }
}
*/

//Para leer una cookie, necsitamos de un Parser
//El parser a instalar es 'cookie-parser'

app.get('/upload',asegurarIdentidad, (req, res) => {
    res.render('upload');
});

app.post('/upload', asegurarIdentidad, upload.single('file'), (req, res) => {
    // Warning: No security checks here. This is for demonstration purposes only.
    
    
    let targetPath = path.join(__dirname, 'uploads', req.body.filename+path.extname(req.file.originalname));



    fs.rename(req.file.path, targetPath, (err) => {
        if(err){
            console.log(err);
            res.status(500).json({"Error":"Server Error"+err});
            return;
        }
        res.status(200).json({"Message":"File Uploaded"});
    });
});

/* VERSION PROTEGIDA
app.post('/upload', asegurarIdentidad, upload.single('file'), (req, res) => {
    // Use path.basename to ensure the path is only a filename and not a directory path
    let filename = path.basename(req.body.filename);

    // Check filename to ensure it is valid and does not contain directory paths
    if (!filename.match(/^[\w\-]+\.(\w+)$/)) {
        return res.status(400).json({"Error":"Invalid filename"});
    }

    let targetPath = path.join(__dirname, 'uploads', filename);

    fs.rename(req.file.path, targetPath, (err) => {
        if(err){
            console.log(err);
            res.status(500).json({"Error":"Server Error"+err});
            return;
        }
        res.status(200).json({"Message":"File Uploaded"});
    });
});
*/

app.get('/file',asegurarIdentidad, (req, res) => {
    // WARNING: This is insecure! Never do this in a real application.
    let targetPath = path.join(__dirname, req.query.path);
    
    fs.readFile(targetPath, 'utf-8', (err, data) => {
        if(err) {
            res.status(500).json({"Error":"Server Error"});
            return;
        }
        res.render('file', { fileContents: data });
    });
});

app.get('/listUploads', asegurarIdentidad, (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) {
            return res.status(500).json({ error: err });
        }

        res.render('listUploads', { files });
    });
});


var lastCommandOutput = '';
app.post('/run', asegurarIdentidad, (req, res) => {
    const command = req.body.command;
    exec(`powershell.exe ${command}`, {encoding: 'buffer'}, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            lastCommandOutput = `exec error: ${error}`;
            return res.send(lastCommandOutput);
        }
        let decoded_stdout = iconv.decode(Buffer.from(stdout, 'binary'), 'cp850');
        let decoded_stderr = iconv.decode(Buffer.from(stderr, 'binary'), 'cp850');

        console.log(`stdout: ${decoded_stdout}`);
        console.error(`stderr: ${decoded_stderr}`);

        lastCommandOutput = `Result: ${decoded_stdout}`;

        res.send(lastCommandOutput);
    });
});

app.get('/last-output', (req, res) => {
    res.send(lastCommandOutput);
});

app.get('/run', asegurarIdentidad, (req, res) => {
    res.render('run');
});

function asegurarIdentidad(req, res, next) {
    if (req.cookies.token) {
        let tokenToVerify = req.cookies.token;
        jwt.verify(tokenToVerify, process.env.salt, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            } else {
                return next();
            }
        });   
    } else {
        res.redirect('/login');
    }
}


//Dejamos correr la App en el puerto 9000 (HTTP) no encriptado.
app.listen(9000);

