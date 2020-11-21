var canvas, ctx,
    x0 = -1, x = -1, //initial x, y
    y0 = -1, y = -1, //current x, y
    color = "#007bff", //line color
    notes=[], //array of lines
    mode=true, //draw=true, erase=false
    time0=Date.now(), time=Date.now(), //time for mouse velocity
    maxNoteSize; //the biggest possible length of a line

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
		instrument: "acoustic_grand_piano",
		onprogress: function(state, progress) {
			//console.log(state, progress);
		},
		onsuccess: function() {
			console.log("MIDI ready");
		}
	});
};
//set color of line
function colorSet(newcolor){
  color=newcolor;
  mode=true;
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
//
function findxy(action, e){
  if(action=='down'){
    //set starting point of line
    x0=e.clientX-canvas.offsetLeft;
    y0=e.clientY-canvas.offsetTop;
  }
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
  if(action=='move'){
    x=e.clientX-canvas.offsetLeft;
    y=e.clientY-canvas.offsetTop;
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
          var note=Math.round(map(noteSize, 1, maxNoteSize, 21, 108));
          MIDI.noteOn(0, note, velocity, 0);
          MIDI.noteOff(0, note, 1);
          console.log(note+" "+velocity);
        }
        //update side of note mouse is at
        notes[i][5]=d;
      }
    }
  }
}
