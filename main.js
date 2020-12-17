var canvas, ctx,
    x0 = -1, x = -1, //initial x, y
    y0 = -1, y = -1, //current x, y
    color = "#007bff", //line color
    notes=[], //array of lines
    mode=true, //draw=true, erase=false
    time0=Date.now(), time=Date.now(), //time for mouse velocity
    maxNoteSize, //the biggest possible length of a line
    instrumentRange=[{start:21, end:108}, {start:21, end:108}, {start:21, end:108}, {start:21, end:96}];

window.onload=function(){
  canvas = document.getElementById('canvas');
  maxNoteSize=Math.round(Math.sqrt(Math.pow(canvas.width, 2)+Math.pow(canvas.height, 2)));
  ctx = canvas.getContext("2d");
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
		}
	});

  $(".custom-file-input").change(function(){
    $(this).siblings(".custom-file-label").addClass("selected").html("Loaded "+$(this).val().split("\\").pop());
  });
};

//function for exporting the line data
function exportNotes(){
  var element = document.createElement('a');
  var exporting="";
  for (var i = 0; i < notes.length; i++) {
    if(i+1<notes.length)
      exporting+=notes[i].slice(0,5).join(";")+"\n";
    else
      exporting+=notes[i].slice(0,5).join(";");
  }
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
    var content=fr.result.split("\n");
    if(content.length>0)
      notes=[];
    for (var i = 0; i < content.length; i++){
      var currentNote=content[i].split(";");
      notes.push([currentNote[0], currentNote[1], currentNote[2], currentNote[3], currentNote[4], null]);
    }
    drawAll();
  }
  fr.readAsText(e.files[0]);
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
function draw(color, x0, y0, x, y){
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x, y);
  ctx.strokeStyle=color;
  ctx.stroke();
  ctx.closePath();
}

//clear canvas, draw all lines on the canvas stored in the array and the current line if we're in drawing mode
function drawAll(){
  clearCanvas();
  $.each(notes, function(index, value){
    draw(value[0], value[1], value[2], value[3], value[4]);
  });
  if(mode){
    draw(color, x0, y0, x, y);
  }
}

//clear the entire canvas
function clearCanvas(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

//calculate distance between point A and B
function distance2(a, b){
  return Math.sqrt(Math.pow(a[0]-b[0], 2)+Math.pow(a[1]-b[1], 2));
}

//return the sum of distances of points AB+BC (B being the mouse cursor)
//and the distance between AC (line start & end)
function distance3(a, b, c){
  var abc=distance2([a[0], a[1]], [b[0], b[1]]) + distance2([b[0], b[1]], [c[0], c[1]]),
      ac=distance2([a[0], a[1]], [c[0], c[1]]);
  return [abc.toFixed(1), ac.toFixed(1)];
}

//return if we're on the left or right side of a line
function sideOfNote(x, y, note){
  var d=(x-note[1])*(note[4]-note[2])-(y-note[2])*(note[3]-note[1]);
  return d<0;
}

//return speed of mouse used for note velocity
function mouseVelocity(){
  time0 = Date.now();
  x_dist = x0 - x;
  y_dist = y0 - y;
  interval = time0 - time;
  time = time0;
  return Math.round(10*Math.sqrt(x_dist*x_dist+y_dist*y_dist)/interval);
}

//map values between two ranges [A-B]->[C-D]
function map(x, in_min, in_max, out_min, out_max){
  return (x-in_min)*(out_max-out_min)/(in_max-in_min)+out_min;
}

//function for deciding the action we're doing and the coordinates of the action
function findxy(action, e){
  var rect = canvas.getBoundingClientRect();

  //set starting point of line
  if(action=='down'){
    x0=e.clientX-rect.left;
    y0=e.clientY-rect.top;
  }

  //mouse button was released
  if(action=='up'){
    //save line to array to redraw always
    if(mode)
      notes.push([color, x0, y0, x, y, null]);
    //clear this line
    x0=-1;
    y0=-1;
    x=-1;
    y=-1;
    //draw (from array only)
    if(mode)
      drawAll();
  }

  //the mouse was moved to a different spot
  if(action=='move'){
    x=e.clientX-rect.left;
    y=e.clientY-rect.top;

    //draw line from start point to current point if mouse was pressed down before
    if(x0!=-1 && y0!=-1 && mode)
      drawAll();

    //erase lines we cross if mouse was pressed down before
    else if(x0!=-1 && y0!=-1 && !mode){
      for(var i=0;i<notes.length;i++){
        var distances=distance3([notes[i][1], notes[i][2]], [x, y], [notes[i][3], notes[i][4]]);
        if(distances[0]==distances[1]){
          notes.splice(i, 1);
          drawAll();
          i--;
        }
      }
    }

    //play note if we're not holding the mouse button
    else{
      for(var i=0;i<notes.length;i++){
        var d=sideOfNote(x, y, notes[i]);
        //newly created note needs a side; we don't do this at creation because we could play note instantly
        if(notes[i][5]==null){
          notes[i][5]=d;
        }

        //if mousePos in note is opposite to current AND distances is returning true, then play note
        var distances=distance3([notes[i][1], notes[i][2]], [x, y], [notes[i][3], notes[i][4]]);

        if(notes[i][5]!=d && distances[0]==distances[1]){
          //calculate mouse velocity
          var velocity = Math.min(127, mouseVelocity());
          //calculate the note based on the length of the line
          var noteSize=Math.round(distance2([notes[i][1], notes[i][2]], [notes[i][3], notes[i][4]]));
          var instrument;
          switch (notes[i][0]) {
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

        //update side of note mouse is at
        notes[i][5]=d;
      }
    }
  }
}
