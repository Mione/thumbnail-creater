(function () {
  var socket = io.connect('http://localhost:8080');
  var FReader;
  var Name;
  var SelectedFile;
  var Path = "http://localhost:8080/";

  window.addEventListener("load", Ready);

  function Ready() {
    if (window.File && window.FileReader) { //These are the necessary HTML5 objects the we are going to use 
      document.getElementById('UploadButton').addEventListener('click', StartUpload);
      document.getElementById('FileBox').addEventListener('change', FileChosen);
    }
    else {
      document.getElementById('UploadArea').innerHTML = "Your Browser Doesn't Support The File API Please Update Your Browser";
    }
  }

  function FileChosen(evnt) {
    SelectedFile = evnt.target.files[0];
    document.getElementById('NameBox').value = SelectedFile.name;
  }

  function StartUpload() {
    if (document.getElementById('FileBox').value != "") {
      FReader = new FileReader();
      Name = document.getElementById('NameBox').value;
      var Content = "<span id='NameArea'>Uploading " + SelectedFile.name + " as " + Name + "</span>";
      Content += '<div id="ProgressContainer"><div id="ProgressBar"></div></div><span id="percent">50%</span>';
      Content += "<span id='Uploaded'> - <span id='MB'>0</span>/" + Math.round(SelectedFile.size / 1048576) + "MB</span>";
      document.getElementById('UploadArea').innerHTML = Content;
      FReader.onload = function (evnt) {
        socket.emit('Upload', { 'Name': Name, Data: evnt.target.result });
      }
      socket.emit('Start', { 'Name': Name, 'Size': SelectedFile.size });
    }
    else {
      alert("Please Select A File");
    }
  }

  function UpdateBar(percent) {
    document.getElementById('ProgressBar').style.width = percent + '%';
    document.getElementById('percent').innerHTML = (Math.round(percent * 100) / 100) + '%';
    var MBDone = Math.round(((percent / 100.0) * SelectedFile.size) / 1048576);
    document.getElementById('MB').innerHTML = MBDone;
  }

  socket.on('MoreData', function (data) {
    UpdateBar(data['Percent']);
    var Place = data['Place'] * 524288; //The Next Blocks Starting Position
    var NewFile; //The Variable that will hold the new Block of Data
    if (SelectedFile.slice)
      NewFile = SelectedFile.slice(Place, Place + Math.min(524288, (SelectedFile.size - Place)));
    else
      NewFile = SelectedFile.slice(Place, Place + Math.min(524288, (SelectedFile.size - Place)));
    FReader.readAsBinaryString(NewFile);
  });

  socket.on('Done', function (data) {
    var Content = "<h2>Video Thumbnail Successfully Created.</h2><br>"
    Content += "<img id='Thumb' src='" + Path + data['Image'] + "' alt='" + Name + "'><br><br>";
    Content += "<button	type='button' name='Upload' value='' id='Restart' class='Button btn btn-default'>Upload Another</button><br>";
    Content += "<p>Warning! This image will be deleted on page refresh. Right click and save it.</p><br>"
    document.getElementById('UploadArea').innerHTML = Content;
    document.getElementById('Restart').addEventListener('click', Refresh);
  });

  function Refresh() {
    location.reload(true);
  }
} ());
