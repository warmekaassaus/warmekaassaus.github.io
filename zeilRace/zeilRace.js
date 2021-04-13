const w = 1200;
const h = 800;

let time = 0;
// don't change to another value than w, h. haha. makes things kaput.
let bgImage;
let horWindMap;
let verWindMap;


var windParticles = [];
var sailboats = [];

function preload() {
  bgImage = createImage(w, h);
  horWindMap = createImage(w, h);
  verWindMap = createImage(w, h);

  updateFlowField();
}

function setup() {
  createCanvas(w, h);

  // make wind particles
  for (let i = 0; i < 1000; i++) {
    windParticles.push(new WindParticle());
  }

  // make sailboats
  for (let id = 0; id < 3; id++) {
    sailboats.push(new Sailboat(id, 300, h / 2.0));
  }

  background(0);
}

function draw() {
  // draw vis of wind speeds. (squared cartesian product mapped to HSB color range)
  image(bgImage, 0, 0);

  // funny workaround for gritty processing IDE which doesn't properly lint multiline foreaches
  windParticles.forEach(p => {
    p.blow();
    p.show();
  });
  sailboats.forEach(b => {
    b.sail();
    b.show();
  });
}


function updateFlowField() {
  horWindMap.loadPixels();
  verWindMap.loadPixels();
  bgImage.loadPixels();
  for (let x = 0.0; x < w; x++) {
    for (let y = 0.0; y < h; y++) {
      // generate perlin noise wind fields, in vertical and horizontal values.
      let xVel = noise(time, x / 500, y / 500);
      let yVel = noise(time + 10000, x / 500, y / 500);

      // make range [0, 255]
      horWindMap.set(x, y, color(xVel * 255));
      verWindMap.set(x, y, color(yVel * 255));

      // make fancy visualization.
      bgImage.set(x, y, colorFromWindSpeed(xVel - .5, yVel - .5));
    }
  }
  horWindMap.updatePixels();
  verWindMap.updatePixels();
  bgImage.updatePixels();
}

function getWind(x, y) {
  return createVector(red(horWindMap.get(round(x), round(y))) / 32.0 - 4.0, red(verWindMap.get(round(x), round(y))) / 32.0 - 4.0);
}

// Expects both xVel and yVel in [-1, 1]
function colorFromWindSpeed(xVel, yVel) {
  let cVal = round((xVel * xVel + yVel * yVel) * -400 + 70);
  colorMode(HSB, 100);
  let c = color(cVal, 50, 80);
  colorMode(RGB, 255);
  return c;
}

class WindParticle {
  constructor() {
    this.newPos();
    this.life = random(100);
  }

  newPos() {
    this.x = random(w);
    this.y = random(w);
  }

  blow() {
    this.life--;

    if (this.life < 0 || this.x < 15 || this.x > w - 15 || this.y < 15 || this.y > h - 15) {
      this.newPos();
      this.life = 100;
      return;
    }

    // if not returned, let's get influenced by the wind at this location.
    // notice that the current pos is at least 15 from the wind map edge. no bound check necessary.
    let wind = getWind(this.x, this.y);
    this.x += wind.x;
    this.y += wind.y;
  }

  show() {
    circle(this.x, this.y, 2);
  }
}

class Sailboat {
  /**
   *  id gebruikt om 'skill' te bepalen. GEZWEM moet wel beter kunnen zeilen.
   *  wordt voorlopig nog negeerd behalve voor het tekenen (kleur)
   *  0: GEZWEM
   *  1: B.O.O.M.
   *  2: I.V.V
   */
  constructor(id, x, y) {
    this.id = id;
    this.x = x + (random(100) - 50);
    this.y = y + (random(100) - 50);
    this.a = random(TWO_PI);
    this.sailAngle = 0;
  }

  sail() {
    if (this.x < 15 || this.x > w - 15 || this.y < 15 || this.y > h - 15) {
      this.sink();
      return;
    }
    let wind = getWind(this.x, this.y);
    this.x += wind.x;
    this.y += wind.y;
  }
  
  // TODO leuker maken.
  show() {
    push();
    translate(this.x, this.y);
    rotate(this.a);
    triangle(-10, -10, 10, -10, 0, 20);
    pop();
  }
  
  /**
    * TODO
    */
  sink() {
    
  }
}
