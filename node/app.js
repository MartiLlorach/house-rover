const net = require("net")
const dgram = require("dgram")
const http = require("http")
const fs = require("fs")
const EventEmitter = require("events")

const address = "0.0.0.0"
const tcpPort = 20000
const udpPort = 20001
const webPort = 2000


// TCP SOCKET
const tcpSoc = net.createServer()

tcpSoc.listen(tcpPort, "0.0.0.0", () => {
    console.log(`tcp socket listening at ${address}:${tcpPort}`);
})

const commandEvent = new EventEmitter()
tcpSoc.on("connection", (socket) => {
    console.log(`client ${socket.remoteAddress} connected`);

    commandEvent.on("command", (com) => {
        socket.write(com)
    })
})


// UDP SOCKET
const udpSoc = dgram.createSocket("udp4")

udpSoc.on('listening', () => {
    console.log(`udp socket listening at ${address}:${udpPort}`);
});

async function* imageStream() {
    while (true) {
        yield await new Promise((resolve) => {
            udpSoc.on("message", (msg) => {
                udpSoc.removeAllListeners("message")
                resolve(msg)
            })
        })
    }
}

udpSoc.bind(udpPort, address)

// WEB SOCKET
const webSoc = http.createServer(async (req, res) => {
    const endpoint = req.url
    switch (endpoint) {
        case "/":
            res.writeHead(200, {
                "Content-Type": "text/html"
            })
            res.end(fs.readFileSync("./index.html"))
            break
        case "/stream":
            res.writeHead(200, {
                'Content-Type': 'multipart/x-mixed-replace; boundary=--frontera'
            });
            for await (const image of imageStream()) {
                res.write("--frontera\r\n");
                res.write("Content-Type: image/png\r\n");
                res.write("Content-Length: " + image.length + "\r\n");
                res.write("\r\n");
                res.write(image);
            }
            break
        case "/flash":
            commandEvent.emit("command", "flash")
            res.statusCode = 501
            res.end()
            break
        case "/favicon.ico":
            res.statusCode = 204
            res.end()
            break
        default:
            res.writeHead(404, {
                "Content-Type": "text/plain"
            })
            res.end("404, resource not found")
            break
    }
})

webSoc.listen(webPort, address, () => {
    console.log(`web socket listening at ${address}:${webPort}`);
})