var canvas, ctx,
    color = "#007bff", //line color
    notes=[], //array of lines
    mode=true, //draw=true, erase=false
    maxNoteSize, //the biggest possible length of a line
    instrumentRange=[{start:21, end:108}, {start:21, end:108}, {start:21, end:108}, {start:21, end:96}];

var previousMouse={x:-1, y:-1};
var line={start:{x:-1, y:-1}, end:{x:-1, y:-1}}
var mediaRecorder;
var chunks = [];

var time={previous:Date.now(), current:Date.now()};

window.onload=function(){
  canvas = document.getElementById('canvas');
  maxNoteSize=Math.round(Math.sqrt(Math.pow(canvas.width, 2)+Math.pow(canvas.height, 2)));
  ctx = canvas.getContext("2d");
  clearCanvas();
  ctx.lineWidth = 3;

  $("#canvas").mousedown(function(e) {
    findxy('down', e);
  });
  $("#canvas").mouseup(function(e) {
    findxy('up', e);
  });
  $("#canvas").mousemove(function(e) {
    findxy('move', e);
  });

  MIDI.loadPlugin({
		soundfontUrl: "./soundfont/",
		instruments: ["acoustic_grand_piano", "acoustic_guitar_nylon", "flute", "electric_guitar_jazz"],
		onprogress: function(state, progress) {
			console.log(state, progress);
		},
		onsuccess: function() {
  		console.log("MIDI ready");
      MIDI.programChange(0, 0); // acoustic_grand_piano
      MIDI.programChange(1, 24); // acoustic_guitar_nylon
      MIDI.programChange(2, 73); // flute
      MIDI.programChange(3, 26); // electric_guitar_jazz
      mediaRecorder=new MediaRecorder(MIDI.getStream().stream); //hopefully to record media

      // push each chunk (blobs) in an array
      mediaRecorder.ondataavailable = function(evt) {
        chunks.push(evt.data);
      };

      // Make blob out of our blobs, and open it.
      mediaRecorder.onstop = function(evt) {
        var element = document.createElement('a');
        var blob = new Blob(chunks, {'type':'audio/ogg; codecs=opus'});
        element.setAttribute('href', URL.createObjectURL(blob));
        element.setAttribute('download', "sound.ogg");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      };
		}
	});

  $(".custom-file-input").change(function(){
    $(this).siblings(".custom-file-label").addClass("selected").html("Loaded "+$(this).val().split("\\").pop());
  });
};

//function for exporting the line data
function exportNotes(){
  var element = document.createElement('a');
  var exporting=JSON.stringify(notes);
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exporting));
  element.setAttribute('download', "notes.txt");
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

//handle file uploads - load the drawn notes
function uploadNotes(e){
  var fr=new FileReader();
  fr.onload=function(){
    try{
      var content=JSON.parse(fr.result);
      if(content.length>0){
        notes=content;
      }
      drawAll();
    }
    catch(e){
      console.log("Couldn't parse file.");
      console.log(e);
    }
  }
  fr.readAsText(e.files[0]);
}

function recorder(mode){
  if(mode){
    chunks = [];
    mediaRecorder.start();
    $("#beginRec").hide();
    $("#endRec").show();
  }
  else{
    mediaRecorder.stop();
    $("#endRec").hide();
    $("#beginRec").show();
  }
}

//set color of line
function colorSet(newcolor){
  $(color).removeClass("spinner-grow spinner-grow-sm");
  color=newcolor;
  mode=true;
  $(color).addClass("spinner-grow spinner-grow-sm");
  $("#eraser").removeClass("spinner-grow spinner-grow-sm");
}

//draw a single line on the canvas
function draw(color, line){
  ctx.beginPath();
  ctx.moveTo(line.start.x, line.start.y);
  ctx.lineTo(line.end.x, line.end.y);
  ctx.strokeStyle=color;
  ctx.stroke();
  ctx.closePath();
}

//clear canvas, draw all lines on the canvas stored in the array and the current line if we're in drawing mode
function drawAll(){
  clearCanvas();
  for (var i = 0; i < notes.length; i++) {
    draw(notes[i].color, notes[i].line);
  }
  if(mode){
    draw(color, line);
  }
}

//clear the entire canvas
function clearCanvas(){
  ctx.fillStyle = "white";
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

//change mode to removing lines
function eraser(){
  mode=false;
  $(color).removeClass("spinner-grow spinner-grow-sm");
  $("#eraser").addClass("spinner-grow spinner-grow-sm");
}

//remove all lines
function clearAll(){
  mode=true;
  notes=[];
  clearCanvas();
  $("#eraser").removeClass("spinner-grow spinner-grow-sm");
  $(color).addClass("spinner-grow spinner-grow-sm");
}

//calculate distance between points on given line (start, end)
function distance(line){
  return Math.sqrt(Math.pow(line.start.x-line.end.x, 2) + Math.pow(line.start.y-line.end.y, 2));
}

//return speed of mouse used for note velocity
function mouseVelocity(){
  time.current = Date.now();
  x_dist = line.start.x - line.end.x;
  y_dist = line.start.y - line.end.y;
  interval = time.current - time.previous;
  time.previous = time.current;
  return Math.round(10 * Math.sqrt(Math.pow(x_dist, 2) + Math.pow(y_dist, 2)) / interval);
}

//map values between two ranges [A-B]->[C-D]
function map(x, in_min, in_max, out_min, out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

//function for deciding the action we're doing and the coordinates of the action
function findxy(action, e){
  var rect = canvas.getBoundingClientRect();

  //set starting point of line
  if(action=='down'){
    line.start.x=e.clientX-rect.left;
    line.start.y=e.clientY-rect.top;
  }

  //mouse button was released
  if(action=='up'){
    //save line to array to redraw always
    if(mode)
      notes.push({color:color, line:line});
    //console.log(JSON.stringify(notes));
    //clear this line
    line={start:{x:-1, y:-1}, end:{x:-1, y:-1}}
    //draw (from array only)
    if(mode)
      drawAll();
  }

  //the mouse was moved to a different spot
  if(action=='move'){
    line.end.x=e.clientX-rect.left;
    line.end.y=e.clientY-rect.top;

    //draw line from start point to current point if mouse was pressed down before
    if(line.start.x!=-1 && line.start.y!=-1 && mode)
      drawAll();

    //erase lines we cross if mouse was pressed down before
    else if(line.start.x!=-1 && line.start.y!=-1 && !mode){
      for(var i=0;i<notes.length;i++){
        var crosses=intersects(notes[i].line, {start:previousMouse, end:line.end});
        if(crosses){
          notes.splice(i, 1);
          drawAll();
          i--;
        }
      }
    }

    //play note if we're not holding the mouse button
    else{
      for(var i=0;i<notes.length;i++){

        //calculating if line between previous mouseX/Y and current mouseX/Y intersects the line
        var crosses=intersects(notes[i].line, {start:previousMouse, end:line.end});

        if(crosses){
          //calculate mouse velocity
          var velocity = Math.min(127, mouseVelocity());
          //calculate the note based on the length of the line
          var noteSize=Math.round(distance(notes[i].line));
          var instrument;
          switch (notes[i].color) {
            case "#007bff":
              instrument=0;
              break;
            case "#28a745":
              instrument=1;
              break;
            case "#ffc107":
              instrument=2;
              break;
            default:
              instrument=3;
          }
          var note=Math.round(map(noteSize, 1, maxNoteSize, instrumentRange[instrument].end, instrumentRange[instrument].start));
          MIDI.noteOn(instrument, note, velocity, 0);
          MIDI.noteOff(instrument, note, 1);
          console.log(note+" "+velocity);
        }
      }
    }

    //update where mouse was in this frame, to use in the next frame
    previousMouse.x=line.end.x;
    previousMouse.y=line.end.y;
  }
}

//returns if the two lines intersect
function intersects(line1, line2){
  var det, gamma, lambda;
  det = (line1.end.x - line1.start.x) * (line2.end.y - line2.start.y) - (line2.end.x - line2.start.x) * (line1.end.y - line1.start.y);
  if (det === 0) {
    return false;
  }
  else {
    lambda = ((line2.end.y - line2.start.y) * (line2.end.x - line1.start.x) + (line2.start.x - line2.end.x) * (line2.end.y - line1.start.y)) / det;
    gamma = ((line1.start.y - line1.end.y) * (line2.end.x - line1.start.x) + (line1.end.x - line1.start.x) * (line2.end.y - line1.start.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}
