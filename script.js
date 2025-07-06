// JavaScript code for the website

// Register GSAP plugins
gsap.registerPlugin(Draggable, ScrollTrigger, Physics2DPlugin, InertiaPlugin);

function initBasicGSAPSlider() {
  console.log('initBasicGSAPSlider called');
  
  const sliders = document.querySelectorAll('[data-gsap-slider-init]');
  console.log('Found sliders:', sliders.length);
  
  sliders.forEach(root => {
    console.log('Processing slider:', root);
    
    if (root._sliderDraggable) root._sliderDraggable.kill();

    const collection = root.querySelector('[data-gsap-slider-collection]');
    const track      = root.querySelector('[data-gsap-slider-list]');
    const items      = Array.from(root.querySelectorAll('[data-gsap-slider-item]'));
    const controls   = Array.from(root.querySelectorAll('[data-gsap-slider-control]'));

    console.log('Slider elements:', { collection, track, items: items.length, controls: controls.length });

    // Inject aria attributes
    root.setAttribute('role','region');
    root.setAttribute('aria-roledescription','carousel');
    root.setAttribute('aria-label','Slider');
    collection.setAttribute('role','group');
    collection.setAttribute('aria-roledescription','Slides List');
    collection.setAttribute('aria-label','Slides');
    items.forEach((slide,i) => {
      slide.setAttribute('role','group');
      slide.setAttribute('aria-roledescription','Slide');
      slide.setAttribute('aria-label',`Slide ${i+1} of ${items.length}`);
      slide.setAttribute('aria-hidden','true');
      slide.setAttribute('aria-selected','false');
      slide.setAttribute('tabindex','-1');
    });
    controls.forEach(btn => {
      const dir = btn.getAttribute('data-gsap-slider-control');
      btn.setAttribute('role','button');
      btn.setAttribute('aria-label', dir==='prev' ? 'Previous Slide' : 'Next Slide');
      btn.disabled = true;
      btn.setAttribute('aria-disabled','true');
    });

    // Determine if slider runs
    const styles      = getComputedStyle(root);
    const statusVar   = styles.getPropertyValue('--slider-status').trim();
    let   spvVar      = parseFloat(styles.getPropertyValue('--slider-spv'));
    const rect        = items[0].getBoundingClientRect();
    const marginRight = parseFloat(getComputedStyle(items[0]).marginRight);
    const slideW      = rect.width + marginRight;
    if (isNaN(spvVar)) {
      spvVar = collection.clientWidth / slideW;
    }
    const spv           = Math.max(1, Math.min(spvVar, items.length));
    const sliderEnabled = statusVar==='on' && spv < items.length;
    root.setAttribute('data-gsap-slider-status', sliderEnabled ? 'active' : 'not-active');

    if (!sliderEnabled) {
      // Teardown when disabled
      track.removeAttribute('style');
      track.onmouseenter = null;
      track.onmouseleave = null;
      track.removeAttribute('data-gsap-slider-list-status');
      root.removeAttribute('role');
      root.removeAttribute('aria-roledescription');
      root.removeAttribute('aria-label');
      collection.removeAttribute('role');
      collection.removeAttribute('aria-roledescription');
      collection.removeAttribute('aria-label');
      items.forEach(slide => {
        slide.removeAttribute('role');
        slide.removeAttribute('aria-roledescription');
        slide.removeAttribute('aria-label');
        slide.removeAttribute('aria-hidden');
        slide.removeAttribute('aria-selected');
        slide.removeAttribute('tabindex');
        slide.removeAttribute('data-gsap-slider-item-status');
      });
      controls.forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('role');
        btn.removeAttribute('aria-label');
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('data-gsap-slider-control-status');
      });
      return;
    }

    // Track hover state
    track.onmouseenter = () => {
      track.setAttribute('data-gsap-slider-list-status','grab');
    };
    track.onmouseleave = () => {
      track.removeAttribute('data-gsap-slider-list-status');
    };

    //Ccalculate bounds and snap points
    const vw        = collection.clientWidth;
    const tw        = track.scrollWidth;
    const maxScroll = Math.max(tw - vw, 0);
    const minX      = -maxScroll;
    const maxX      = 0;
    const maxIndex  = maxScroll / slideW;
    const full      = Math.floor(maxIndex);
    const snapPoints = [];
    for (let i = 0; i <= full; i++) {
      snapPoints.push(-i * slideW);
    }
    if (full < maxIndex) {
      snapPoints.push(-maxIndex * slideW);
    }

    let activeIndex    = 0;
    const setX         = gsap.quickSetter(track,'x','px');
    let collectionRect = collection.getBoundingClientRect();

    function updateStatus(x) {
      if (x > maxX || x < minX) {
        return;
      }

      // Clamp and find closest snap
      const calcX = x > maxX ? maxX : (x < minX ? minX : x);
      let closest = snapPoints[0];
      snapPoints.forEach(pt => {
        if (Math.abs(pt - calcX) < Math.abs(closest - calcX)) {
          closest = pt;
        }
      });
      activeIndex = snapPoints.indexOf(closest);

      // Update Slide Attributes
      items.forEach((slide,i) => {
        const r           = slide.getBoundingClientRect();
        const leftEdge    = r.left - collectionRect.left;
        const slideCenter = leftEdge + r.width/2;
        const inView      = slideCenter > 0 && slideCenter < collectionRect.width;
        const status      = i === activeIndex ? 'active' : inView ? 'inview' : 'not-active';

        slide.setAttribute('data-gsap-slider-item-status', status);
        slide.setAttribute('aria-selected',    i === activeIndex ? 'true' : 'false');
        slide.setAttribute('aria-hidden',      inView ? 'false' : 'true');
        slide.setAttribute('tabindex',         i === activeIndex ? '0'    : '-1');
      });

      // Update Controls - always enable for circular navigation
      controls.forEach(btn => {
        const dir = btn.getAttribute('data-gsap-slider-control');
        
        btn.disabled = false;
        btn.setAttribute('aria-disabled', 'false');
        btn.setAttribute('data-gsap-slider-control-status', 'active');
      });
    }

    controls.forEach(btn => {
      const dir = btn.getAttribute('data-gsap-slider-control');
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        
        let target;
        if (dir === 'next') {
          // If at last slide, go to first slide (circular)
          target = activeIndex >= snapPoints.length - 1 ? 0 : activeIndex + 1;
        } else {
          // If at first slide, go to last slide (circular)
          target = activeIndex <= 0 ? snapPoints.length - 1 : activeIndex - 1;
        }
        
        gsap.to(track, {
          duration: 0.4,
          x: snapPoints[target],
          onUpdate: () => updateStatus(gsap.getProperty(track,'x'))
        });
      });
    });

    // Initialize Draggable
    root._sliderDraggable = Draggable.create(track, {
      type: 'x',
      bounds: {minX, maxX},
      edgeResistance: 0.75,
      snap: {x: snapPoints},
      onPress() {
        track.setAttribute('data-gsap-slider-list-status','grabbing');
        collectionRect = collection.getBoundingClientRect();
      },
      onDrag() {
        setX(this.x);
        updateStatus(this.x);
      },
      onRelease() {
        setX(this.x);
        updateStatus(this.x);
        track.setAttribute('data-gsap-slider-list-status','grab');
      }
    })[0];

    // Initial state
    setX(0);
    updateStatus(0);
  });
}

// Debouncer: For resizing the window
function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

window.addEventListener('resize', debounceOnWidthChange(initBasicGSAPSlider, 200));

function initDynamicCurrentTime() {
  const defaultTimezone = "Europe/Amsterdam";

  // Helper function to format numbers with leading zero
  const formatNumber = (number) => number.toString().padStart(2, '0');

  // Function to create a time formatter with the correct timezone
  const createFormatter = (timezone) => {
    return new Intl.DateTimeFormat([], {
      timeZone: timezone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Optional: Remove to match your simpler script
    });
  };

  // Function to parse the formatted string into parts
  const parseFormattedTime = (formattedDateTime) => {
    const match = formattedDateTime.match(/(\d+):(\d+):(\d+)\s*([\w+]+)/);
    if (match) {
      return {
        hours: match[1],
        minutes: match[2],
        seconds: match[3],
        timezone: match[4], // Handles both GMT+X and CET cases
      };
    }
    return null;
  };

  // Function to update the time for all elements
  const updateTime = () => {
    document.querySelectorAll('[data-current-time]').forEach((element) => {
      const timezone = element.getAttribute('data-current-time') || defaultTimezone;
      const formatter = createFormatter(timezone);
      const now = new Date();
      const formattedDateTime = formatter.format(now);

      const timeParts = parseFormattedTime(formattedDateTime);
      if (timeParts) {
        const {
          hours,
          minutes,
          seconds,
          timezone
        } = timeParts;

        // Update child elements if they exist
        const hoursElem = element.querySelector('[data-current-time-hours]');
        const minutesElem = element.querySelector('[data-current-time-minutes]');
        const secondsElem = element.querySelector('[data-current-time-seconds]');
        const timezoneElem = element.querySelector('[data-current-time-timezone]');

        if (hoursElem) hoursElem.textContent = hours;
        if (minutesElem) minutesElem.textContent = minutes;
        if (secondsElem) secondsElem.textContent = seconds;
        if (timezoneElem) timezoneElem.textContent = timezone;
      }
    });
  };

  // Initial update and interval for subsequent updates
  updateTime();
  setInterval(updateTime, 1000);
}

// Dark/Light mode functionality
function initCookieDarkLight() {

  // Function to toggle theme
  function initThemeCheck() {
    // Get the element that has [data-theme-status] attribute
    const dashThemeElement = document.querySelector('[data-theme-status]');
    if (!dashThemeElement) return;

    // Toggle between light/dark
    const currentTheme = dashThemeElement.getAttribute('data-theme-status');
    const newTheme = (currentTheme === 'light') ? 'dark' : 'light';

    dashThemeElement.setAttribute('data-theme-status', newTheme);
    Cookies.set('theme', newTheme, { expires: 365 });
  }

  // Keydown to toggle theme when Shift + T is pressed
  document.addEventListener('keydown', function(e) {
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable) {
      return; // Do nothing if typing into a field
    }

    if (e.shiftKey && e.keyCode === 84) { // Shift+T
      e.preventDefault();
      initThemeCheck();
    }
  });

  // For all elements with [data-theme-toggle], add click handler
  document.querySelectorAll('[data-theme-toggle]').forEach(function(button) {
    button.addEventListener('click', initThemeCheck);
  });

  // If theme cookie is 'dark', set theme to dark
  if (Cookies.get('theme') === 'dark') {
    const themeElement = document.querySelector('[data-theme-status]');
    if (themeElement) {
      themeElement.setAttribute('data-theme-status', 'dark');
    }
  }
}

// Custom Cursor Functionality
function initVelocityBasedCustomCursor() {
  const cursor = document.querySelector(".cursor");
  if (!cursor) return; // Exit if cursor element doesn't exist
  
  const innerElements = cursor.querySelectorAll(".cursor-inner");
  
  innerElements.forEach(el => el.style.transformOrigin = "50% 50%");
  
  let currentRotation = 0;
  let targetRotation = 0;
  let lastX = 0;
  let lastTime = performance.now();
  
  document.addEventListener("mousemove", e => {
    // Make the cursor follow the actual client position
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    
    // Get current time in miliseconds
    const currentTime = performance.now();
    
    // Calculate ellasped time since last move
    const timeDifference = currentTime - lastTime;
    
    if (timeDifference > 0) {
      const positionDifference = e.clientX - lastX;
      const velocityX = positionDifference / timeDifference;
      
      // Clamp the rotation between -70 and 70 degrees
      targetRotation = Math.max(Math.min(velocityX * 100, 70), -70);
    }
    lastX = e.clientX;
    lastTime = currentTime;
  });
  
  // Use a RAF method to match display refresh rate for smoothest result
  function animateRotation() {
    currentRotation += (targetRotation - currentRotation) * 0.1;
    targetRotation += (0 - targetRotation) * 0.05;
    innerElements.forEach(el => el.style.transform = `rotate(${currentRotation}deg)`);
    requestAnimationFrame(animateRotation);
  }
  animateRotation();
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    console.log('GSAP available:', typeof gsap !== 'undefined');
    console.log('Draggable available:', typeof Draggable !== 'undefined');
    console.log('InertiaPlugin available:', typeof InertiaPlugin !== 'undefined');
    
    // Check if slider elements exist
    const sliderElement = document.querySelector('[data-gsap-slider-init]');
    console.log('Slider element found:', !!sliderElement);
    
    // Initialize Dynamic Current Time
    initDynamicCurrentTime();
    
    // Initialize Basic GSAP Slider with delay to ensure GSAP is loaded
    setTimeout(() => {
        console.log('Initializing GSAP slider...');
        initBasicGSAPSlider();
    }, 100);
    
    // Initialize Dark/Light mode
    initCookieDarkLight();
    
    // Initialize Custom Cursor
    initVelocityBasedCustomCursor();
    
    // Add your JavaScript functionality here
    
    // Example: Add click event to header
    const header = document.querySelector('header h1');
    if (header) {
        header.addEventListener('click', function() {
            console.log('Header clicked!');
            // Add your custom functionality here
        });
    }
});

// Example function
function exampleFunction() {
    console.log('This is an example function');
    // Add your custom code here
}

// Example: Handle window resize
window.addEventListener('resize', function() {
    console.log('Window resized');
    // Add responsive behavior here
});

// Document title change on tab focus/blur
const documentTitleStore = document.title;
const documentTitleOnBlur = "See you next time"; // Define your custom title here

// Set original title if user is on the site
window.addEventListener("focus", () => {
  document.title = documentTitleStore;
});

// If user leaves tab, set the alternative title
window.addEventListener("blur", () => {
  document.title = documentTitleOnBlur;
});

// Scroll Progress Counter functionality
function initScrollProgressNumber() {  
  const progressCounter = document.querySelector('[data-progress-nr]');

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const progress = Math.round(self.progress * 100); // Calculate progress as a percentage
      progressCounter.textContent = progress.toString().padStart(2, '0'); // Update counter
    },
  });
}

// Initialize Scroll Progress Number
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgressNumber();
});

function initCSSMarquee() {
  const pixelsPerSecond = 75; // Set the marquee speed (pixels per second)
  const marquees = document.querySelectorAll('[data-css-marquee]');
  
  // Duplicate each [data-css-marquee-list] element inside its container
  marquees.forEach(marquee => {
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      const duplicate = list.cloneNode(true);
      marquee.appendChild(duplicate);
    });
  });

  // Create an IntersectionObserver to check if the marquee container is in view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.querySelectorAll('[data-css-marquee-list]').forEach(list => 
        list.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
      );
    });
  }, { threshold: 0 });
  
  // Calculate the width and set the animation duration accordingly
  marquees.forEach(marquee => {
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      list.style.animationDuration = (list.offsetWidth / pixelsPerSecond) + 's';
      list.style.animationPlayState = 'paused';
    });
    observer.observe(marquee);
  });
}

// Initialize all functions
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgressNumber();
  initCSSMarquee();
  initGlowingInteractiveDotsGrid();
  initCenterButtons();
});

function initGlowingInteractiveDotsGrid() {
  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
    const colors         = { base: "#245E51", active: "#A8FF51" };
    const threshold      = 200;
    const speedThreshold = 100;
    const shockRadius    = 325;
    const shockPower     = 5;
    const maxSpeed       = 5000;
    const centerHole     = true;

    let dots       = [];
    let dotCenters = [];

    function buildGrid() {
      container.innerHTML = "";
      dots = [];
      dotCenters = [];

      const style = getComputedStyle(container);
      const dotPx = parseFloat(style.fontSize);
      const gapPx = dotPx * 2;
      const contW = container.clientWidth;
      const contH = container.clientHeight;

      const cols  = Math.floor((contW + gapPx) / (dotPx + gapPx));
      const rows  = Math.floor((contH + gapPx) / (dotPx + gapPx));
      const total = cols * rows;

      const holeCols = centerHole ? (cols % 2 === 0 ? 4 : 5) : 0;
      const holeRows = centerHole ? (rows % 2 === 0 ? 4 : 5) : 0;
      const startCol = (cols - holeCols) / 2;
      const startRow = (rows - holeRows) / 2;

      for (let i = 0; i < total; i++) {
        const row    = Math.floor(i / cols);
        const col    = i % cols;
        const isHole = centerHole &&
          row >= startRow && row < startRow + holeRows &&
          col >= startCol && col < startCol + holeCols;

        const d = document.createElement("div");
        d.classList.add("dot");

        if (isHole) {
          d.style.visibility = "hidden";
          d._isHole = true;
        } else {
          gsap.set(d, { x: 0, y: 0, backgroundColor: colors.base });
          d._inertiaApplied = false;
        }

        container.appendChild(d);
        dots.push(d);
      }

      requestAnimationFrame(() => {
        dotCenters = dots
          .filter(d => !d._isHole)
          .map(d => {
            const r = d.getBoundingClientRect();
            return {
              el: d,
              x:  r.left + window.scrollX + r.width  / 2,
              y:  r.top  + window.scrollY + r.height / 2
            };
          });
      });
    }

    window.addEventListener("resize", buildGrid);
    buildGrid();

    let lastTime = 0, lastX = 0, lastY = 0;

    window.addEventListener("mousemove", e => {
      const now   = performance.now();
      const dt    = now - lastTime || 16;
      let   dx    = e.pageX - lastX;
      let   dy    = e.pageY - lastY;
      let   vx    = dx / dt * 1000;
      let   vy    = dy / dt * 1000;
      let   speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale; vy *= scale; speed = maxSpeed;
      }

      lastTime = now;
      lastX    = e.pageX;
      lastY    = e.pageY;

      requestAnimationFrame(() => {
        dotCenters.forEach(({ el, x, y }) => {
          const dist = Math.hypot(x - e.pageX, y - e.pageY);
          const t    = Math.max(0, 1 - dist / threshold);
          const col  = gsap.utils.interpolate(colors.base, colors.active, t);
          gsap.set(el, { backgroundColor: col });

          if (speed > speedThreshold && dist < threshold && !el._inertiaApplied) {
            el._inertiaApplied = true;
            const pushX = (x - e.pageX) + vx * 0.005;
            const pushY = (y - e.pageY) + vy * 0.005;

            gsap.to(el, {
              inertia: { x: pushX, y: pushY, resistance: 750 },
              onComplete() {
                gsap.to(el, {
                  x: 0,
                  y: 0,
                  duration: 1.5,
                  ease: "elastic.out(1,0.75)"
                });
                el._inertiaApplied = false;
              }
            });
          }
        });
      });
    });

    window.addEventListener("click", e => {
      dotCenters.forEach(({ el, x, y }) => {
        const dist = Math.hypot(x - e.pageX, y - e.pageY);
        if (dist < shockRadius && !el._inertiaApplied) {
          el._inertiaApplied = true;
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX   = (x - e.pageX) * shockPower * falloff;
          const pushY   = (y - e.pageY) * shockPower * falloff;

          gsap.to(el, {
            inertia: { x: pushX, y: pushY, resistance: 750 },
            onComplete() {
              gsap.to(el, {
                x: 0,
                y: 0,
                duration: 1.5,
                ease: "elastic.out(1,0.75)"
              });
              el._inertiaApplied = false;
            }
          });
        }
      });
    });
  });
}

// Initialize Glowing Interactive Dots Grid
document.addEventListener('DOMContentLoaded', () => {
  initGlowingInteractiveDotsGrid();
});

function initCenterButtons() {
  // Add click events for center buttons
  const centerButtons = document.querySelectorAll('.center-btn');
  centerButtons.forEach(button => {
    const buttonText = button.querySelector('.btn-bounce-text').textContent.trim();
    
    if (buttonText === 'Discover Music') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.youtube.com/@sharedamusic/playlists', '_blank');
      });
    } else if (buttonText === 'Discover Anime') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.crunchyroll.com/de/videos/popular', '_blank');
      });
    }
  });
}

// Initialize Center Buttons
document.addEventListener('DOMContentLoaded', () => {
  initCenterButtons();
});
