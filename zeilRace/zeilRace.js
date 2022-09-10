// width of canvas
const w = 1200;
// height of canvas
const h = 800;

let BEACH_COLOR;

// objects containing images representing windspeedmap and both dimensions of wind
let windImage;
let horWindMap;
let verWindMap;
let mapImage;
let depthMap;

// arrays to contain objects.
var windParticles = [];
var sailboats = [];

/**
 * Initial setup function. contains slow operations.
 * Before this function returns, the div with id="p5_loading" is shown.
 * That's convenient for a loading animation.
 */
function preload() {
  windImage = createImage(w, h);
  horWindMap = createImage(w, h);
  verWindMap = createImage(w, h);
  mapImage = createImage(w, h);
  depthMap = createImage(w, h);

  BEACH_COLOR = color(245, 245, 220);

  updateFlowField();

  generateMap();
}

/**
 * Method for bookkeeping things not necessary to do in preload().
 */
function setup() {
  createCanvas(w, h);

  // make wind particles
  for (let i = 0; i < 500; i++) {
    windParticles.push(new WindParticle());
  }

  // make sailboats
  for (let id = 0; id < 20; id++) {
    sailboats.push(new Sailboat(id, 300, h / 2.0));
  }

  // draw black background (for debugging mostly, is overwritten by windspeed map)
  background(0);
}

/**
 * Method run for every browser frame. Used to time physics as well as redrawing objects.
 */
function draw() {
  // draw map
  image(mapImage, 0, 0);
  // draw vis of wind speeds. (squared cartesian product mapped to HSB color range)
  tint(255, 127);
  image(windImage, 0, 0);
  tint(255, 255);

  noFill();
  
  // let all wind particles and sailboats do their time iteration
  windParticles.forEach(p => {
    p.blow();
    p.show();
  });
  
  fill(255);
  stroke(0);
  sailboats.forEach(b => {
    b.sail();
    b.show();
  });

  // fade in
  if (frameCount < 255) {
    noStroke();
    fill(255, 255, 255, 255 - 2 * frameCount);
    rect(0, 0, w, h);
  }
}

/**
 * Generates the map.
 */
function generateMap() {
  depthMap.loadPixels();
  mapImage.loadPixels();

  for (let x = 0.0; x < w; x++) {
    for (let y = 0.0; y < h; y++) {
      // generate perlin noise depth value (now in range [0..1])
      let depth = noise(x / 500, y / 500 + 5000);
      // TODO make center always deep

      // make range [0, 255] and write as shades of grey.
      // could be implemented using the pixels array for a speed improvement.
      depthMap.set(x, y, color(depth * 255));

      // make fancy visualization. 
      // could be implemented using the pixels array for a speed improvement.
      mapImage.set(x, y, colorFromDepth(depth * 255));
    }
  }

  depthMap.updatePixels();
  mapImage.updatePixels();
}

function colorFromDepth(depth) {
  if (depth > 100) {          // water case
    return color(230 - depth, 230 - depth, 230);
  } else if (depth > 80) {    // beach case
    return BEACH_COLOR;
  } else {                    // grass case
    return color(depth, 200 - depth, depth);
  }
}

/**
 * Prepares the three images for later use.
 * Slow!! but it OK...
 */
function updateFlowField() {
  // get pixels arrays, prevents possible buggy behaviour when setting pixel values
  horWindMap.loadPixels();
  verWindMap.loadPixels();
  windImage.loadPixels();
  for (let x = 0.0; x < w; x++) {
    for (let y = 0.0; y < h; y++) {
      // generate perlin noise wind fields, in vertical and horizontal values.
      let xVel = noise(x / 500, y / 500);
      let yVel = noise(x / 500 + 1000, y / 500 + 1000);

      // make range [0, 255] and write as shades of grey.
      // could be implemented using the pixels array for a speed improvement.
      horWindMap.set(x, y, color(xVel * 255));
      verWindMap.set(x, y, color(yVel * 255));

      // make fancy visualization. 
      // could be implemented using the pixels array for a speed improvement.
      windImage.set(x, y, colorFromWindSpeed(xVel - .5, yVel - .5));
    }
  }
  // write values just set to image object, should we want to draw them
  horWindMap.updatePixels();
  verWindMap.updatePixels();
  windImage.updatePixels();
}

/**
 * Helper method to easily fetch wind at some position on the canvas.
 * 
 * @param x horizontal position on canvas
 * @param y vertical position on canvas
 * @returns vector with horizontal and vertical components of wind at that location (axis oriented)
 */
function getWind(x, y) {
  return createVector(red(horWindMap.get(round(x), round(y))) / 32.0 - 4.0, red(verWindMap.get(round(x), round(y))) / 32.0 - 4.0);
}

/**
 * Concocts color from 2D wind.
 * Calculates squared cartesian product (faster than calculating sqrt...)
 * and maps to a color by abusing HSB colorspace.
 * xVelExpects both xVel and yVel in [-1, 1]
 */
function colorFromWindSpeed(xVel, yVel) {
  let cVal = round((xVel * xVel + yVel * yVel) * -400 + 70);
  colorMode(HSB, 100);
  let c = color(cVal, 50, 80);
  colorMode(RGB, 255);
  return c;
}

class WindParticle {
  constructor() {
    // run respawn sequence
    this.newPos();
    
    // set age. decremented every iteration of blow(), when 0, respawn.
    // this is done so as to not accumulate particles in low pressure areas.
    // they kinda do gradient descent lmao
    this.life = random(100);
  }

  // respawn in some random location
  newPos() {
    this.currentPos = createVector(random(w), random(h));
    this.posses = [this.currentPos.copy];
  }

  blow() {
    // age one step
    this.life--;

    // check if this particle is either old or almost out of bounds, then respawn
    if (this.life < 0 || this.currentPos.x < 15 || this.currentPos.x > w - 15 || this.currentPos.y < 15 || this.currentPos.y > h - 15) {
      this.newPos();
      this.life = 100;
      return;
    }

    // if not returned, let's get influenced by the wind at this location.
    // notice that the current pos is at least 15 from the wind map edge. no bound check necessary.
    let wind = getWind(this.currentPos.x, this.currentPos.y);
    this.currentPos.x += wind.x;
    this.currentPos.y += wind.y;
    // only add new point every once in a while. because JS is slow! :)
    if (this.life % 10 == 0) this.posses.push(createVector(this.currentPos.x, this.currentPos.y));
  }

  /**
   * draws this wind particle as a little circle. bear in mind this doesn't set strokeweight or fill
   */
  show() {
    stroke(50, this.life * 16);
    beginShape();
    this.posses.forEach((pt) => {
      //circle(pt.x, pt.y, 2);
      vertex(pt.x, pt.y);
    });
    vertex(this.currentPos.x, this.currentPos.y);
    endShape();
  }
}

function mouseDragged() {
  let diffVector = createVector(sailboats[0].x - mouseX, sailboats[0].y - mouseY).normalize();
  sailboats[0].a = diffVector.heading() + PI / 2;
  sailboats[0].x = mouseX + diffVector.x * 20;
  sailboats[0].y = mouseY + diffVector.y * 20;
}

class Sailboat {
  /**
   * id gebruikt om 'skill' te bepalen. GEZWEM moet wel beter kunnen zeilen.
   * wordt voorlopig nog negeerd behalve voor het tekenen (kleur)
   * 0: GEZWEM
   * 1: B.O.O.M.
   * 2: I.V.V
   * etc...
   */
  constructor(id, x, y) {
    this.id = id;
    this.x = x + (random(100) - 50);
    this.y = y + (random(100) - 50);
    this.a = random(TWO_PI);
    this.aVel = 0;
    this.vForward = 0.0001;          // velocity in pixels per frame in forward direction
    this.vAthwartships = 0.001;     // velocity in pixels per frame right-angled to forward. (bakboord = positief)
    this.sailAngle = 0.0;
    this.sheetTight = false;

    // controls:
    this.rudder = 0.0;           // angular velocity. positive = clockwise
    this.sailAngleBound = .8;    // this is essentially the length of the sheet. limits sailAngle.
  }

  /**
   * Runs physics as well as 'tactics'; steering, sail position, etc.
   */
  sail() {
    // check edge of world; causes boat to sink
    if (this.x < 15 || this.x > w - 15 || this.y < 15 || this.y > h - 15) {
      this.sink();
      return;
    }
    // physics:
    let wind = getWind(this.x, this.y);

    wind.rotate(-this.a);             // wind now contains wind in (athwartships (naar bakboord = positief), along (naar voorsteven = positief))
    wind.x += this.vAthwartships;
    wind.y += this.vForward;
    wind.rotate(-this.sailAngle);     // wind now contains wind in (haaks op zeil (naar stuurbood = positief), en in verlengde (naar voorlijk = positief))

    // let wind push sail into sheet.
    this.sailAngle += wind.mag() * wind.x  * .2;
    this.sheetTight = false;
    if (this.sailAngle > this.sailAngleBound || this.sailAngle < -this.sailAngleBound) {
      this.sheetTight = true;
      this.sailAngle = this.sailAngle > 0 ? this.sailAngleBound : - this.sailAngleBound;
    }

    // compute lift from sail
    let sailForce = createVector(wind.x, -.75 * wind.y);
    sailForce.rotate(this.sailAngle * .8);
    if (this.sheetTight) {
      // accelerate vessel
      this.vAthwartships += sailForce.x * .24;
      this.vForward += sailForce.y * .24;
      // apply main sheet torque
      this.aVel += sailForce.x * .002;
    }

    this.aVel += this.rudder * (this.vAthwartships * this.vAthwartships + this.vForward * this.vForward);
    this.a += this.aVel;

    let step = createVector(this.vAthwartships, this.vForward);
    step.rotate(this.a);

    // aerodynamic drag (wind only, doesn't take into account own speed)
    step.add(getWind(this.x, this.y).mult(.2));

    this.x += step.x;
    this.y += step.y;

    // hydrodynamic drag
    this.vAthwartships *= .01;
    this.vForward *= .8;
    this.aVel *= .5;
  }
  
  /**
   * TODO make look better. include sail, colors, make bob in waves maybe, etc.
   */
  show() {
    // push projection matrix
    push();
    // translate to boat center
    translate(this.x, this.y);
    // rotate by this boat's orientation
    rotate(this.a);
    // draw hull
    strokeWeight(1);
    stroke(150, 100, 80);
    fill(150, 100, 80);
    triangle(-12, -40, 12, -40, 0, 24);
    stroke(20);
    strokeWeight(2);
    curve(-50, -200, 12, -40, 0, 25, -80, 80);
    curve(50, -200, -12, -40, 0, 25, 80, 80);
    
    // transom
    line(-12, -40, 12, -40);

    // brown
    stroke(100, 40, 12);
    // bow sprit
    line(0, 15, 0, 32);

    // boom (giek)
    push();
    rotate(this.sailAngle *.8);
    line(0, 0, 0, -40);
    pop();


    // teak deck caulking lines
    push();
    strokeWeight(.5);
    noFill();
    stroke(50, 20, 6);
    for (let i = -4; i <= 4; i++) {
      curve(-12 * i, -200, 2 * i, -40, 0, 25, -15 * i, 80);
    }
    pop();

    // rudder wheel
    line(-6, -30, 6, -30);
    line(-2, -28, 2, -28);

    strokeWeight(1);
    //hatch
    
    rect(-6, -5, 12, -15);



    // TODO draw more static things, possibly depending on this.id


    stroke(220, 220, 200);
    strokeWeight(3);
    noFill();

    push();
    // draw main sail
    rotate(this.sailAngle * .8);
    if (this.sheetTight) {
      curve(- 16 * this.sailAngle, 10, 0, 0, 0, -40, - 8 * this.sailAngle, -50);
    } else {
      curve(32 * random(-1, 1), 10, 0, 0, 0, -40, - 32 * this.sailAngle, -50);
    }
    pop();

    // draw forward sail
    push();
    translate(0, 30);
    rotate(this.sailAngle * .8);
    if (this.sheetTight) {
      curve(- 40 * this.sailAngle, 8, 0, 0, 0, -30, - 6 * this.sailAngle, -40);
    } else {
      curve(24 * random(-1, 1), 8, 0, 0, 0, -30, - 24 * this.sailAngle, -40);
    }
    pop();

    // TODO draw more

    // pop projection matrix to return to default
    pop();
  }
  
  /**
   * TODO
   */
  sink() {
    
  }
}
