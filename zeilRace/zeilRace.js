// width of canvas
const w = 1200;
// height of canvas
const h = 800;

// objects containing images representing windspeedmap and both dimensions of wind
let bgImage;
let horWindMap;
let verWindMap;

// arrays to contain objects.
var windParticles = [];
var sailboats = [];

/**
 * Initial setup function. contains slow operations.
 * Before this function returns, the div with id="p5_loading" is shown.
 * That's convenient for a loading animation.
 */
function preload() {
  bgImage = createImage(w, h);
  horWindMap = createImage(w, h);
  verWindMap = createImage(w, h);

  updateFlowField();
}

/**
 * Method for bookkeeping things not necessary to do in preload().
 */
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

  // draw black background (for debugging mostly, is overwritten by windspeed map)
  background(0);
}

/**
 * Method run for every browser frame. Used to time physics as well as redrawing objects.
 */
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

/**
 * Prepares the three images for later use.
 * Slow!! but it OK...
 */
function updateFlowField() {
  // get pixels arrays, prevents possible buggy behaviour when setting pixel values
  horWindMap.loadPixels();
  verWindMap.loadPixels();
  bgImage.loadPixels();
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
      bgImage.set(x, y, colorFromWindSpeed(xVel - .5, yVel - .5));
    }
  }
  // write values just set to image object, should we want to draw them
  horWindMap.updatePixels();
  verWindMap.updatePixels();
  bgImage.updatePixels();
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
    this.x = random(w);
    this.y = random(h);
  }

  blow() {
    // age one step
    this.life--;

    // check if this particle is either old or almost out of bounds, then respawn
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

  /**
   * draws this wind particle as a little circle. bear in mind this doesn't set stroke or fill yet.
   */
  show() {
    circle(this.x, this.y, 2);
  }
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
    this.sailAngle = 0;
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
    // dumb physics:
    let wind = getWind(this.x, this.y);
    this.x += wind.x;
    this.y += wind.y;
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
    triangle(-10, -10, 10, -10, 0, 20);
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
