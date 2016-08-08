var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , exec = require('child_process').exec
  , util = require('util')
  , Files = {};
var path = require('path');
app.listen(8080);

function handler(request, response) {


	var filePath = '.' + request.url;
	if (filePath == './')
		filePath = './index.html';

	var extname = path.extname(filePath);
	var contentType = 'text/html';
	switch (extname) {
		case '.jpg':
			contentType = 'image/jpeg';
			break;
		case '.png':
			contentType = 'image/png';
			break;
	}

	fs.exists(filePath, function (exists) {

		if (exists) {
			fs.readFile(filePath, function (error, content) {
				if (error) {
					response.writeHead(500);
					response.end();
				}
				else {
					response.writeHead(200, { 'Content-Type': contentType });
					response.end(content, 'utf-8');
				}
			});
		}
		else {
			response.writeHead(404);
			response.end();
		}
	});
}

io.sockets.on('connection', function (socket) {
	socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
		var Name = data['Name'];
		Files[Name] = {  //Create a new Entry in The Files Variable
			FileSize: data['Size'],
			Data: "",
			Downloaded: 0
		}
		var Place = 0;
		try {
			var Stat = fs.statSync('Temp/' + Name);
			if (Stat.isFile()) {
				Files[Name]['Downloaded'] = Stat.size;
				Place = Stat.size / 524288;
			}
		}
		catch (er) { } //It's a New File
		fs.open("Temp/" + Name, 'a', 0755, function (err, fd) {
			if (err) {
				console.log(err);
			}
			else {
				Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
				socket.emit('MoreData', { 'Place': Place, Percent: 0 });
			}
		});
	});

  socket.on('disconnect', function () {
		rmDir('Public', false);
		rmDir('Video', false);
	});

	socket.on('Upload', function (data) {
		var Name = data['Name'];
		Files[Name]['Downloaded'] += data['Data'].length;
		Files[Name]['Data'] += data['Data'];
		if (Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
		{
			fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function (err, Writen) {
				exec("ffmpeg -i Temp/" + Name + " -ss 00:00:01.000 -vframes 1 Public/" + Name + ".jpg", function (err) {
					console.log(err);
					socket.emit('Done', { 'Image': 'Public/' + Name + '.jpg' });
				});
			});
		}
		else if (Files[Name]['Data'].length > 10485760) { //If the Data Buffer reaches 10MB
			fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function (err, Writen) {
				Files[Name]['Data'] = ""; //Reset The Buffer
				var Place = Files[Name]['Downloaded'] / 524288;
				var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
				socket.emit('MoreData', { 'Place': Place, 'Percent': Percent });
			});
		}
		else {
			var Place = Files[Name]['Downloaded'] / 524288;
			var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
			socket.emit('MoreData', { 'Place': Place, 'Percent': Percent });
		}
		});
});

var rmDir = function (dirPath, removeSelf) {
	if (removeSelf === undefined)
		removeSelf = true;
	try { var files = fs.readdirSync(dirPath); }
	catch (e) { return; }
	if (files.length > 0)
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				fs.unlinkSync(filePath);
			else
				rmDir(filePath);
		}
	if (removeSelf)
		fs.rmdirSync(dirPath);
};