/*global $*/
$(function () {
  "use strict";
  // constants
  var BOUNCINESS = 0.95;
  var DRAG = 0.02;
  var BALL_RADIUS = 40;
  var FINGER_RADIUS = 20;
  var TOUCH_MOTION_DAMP = 0.6;

  // zepto DOM wrappers
  var $circle = $('circle');
  var $win = $(window);

  var x = $win.width() / 2;
  var y = $win.height() / 2;

  // motion
  var mx = 0;
  var my = 0;

  // acceleration
  var ax = 0;
  var ay = 0;

  // touch state
  var lastTouch = new Date().getTime();
  var dragging = false;
  var update = function () {
    $circle.attr("cx", x);
    $circle.attr("cy", y);
  };

  var currentTouches = [];

  function ongoingTouchIndexById(idToFind) {
    for (var i = 0; i < currentTouches.length; i++) {
      var id = currentTouches[i].touch.identifier;
      if (id === idToFind) {
        return i;
      }
    }
    return -1;
  }

  if (!window.DeviceOrientationEvent) {
    $(document.body).text("Your browser does not support device orientation");
  } else if (!window.DeviceMotionEvent) {
    $(document.body).text("Your browser does not support device motion");
  } else {
    // init
    update();

    // handle drag events (only ones that start inside ball)
    $(document).on("touchstart", function (evt) {
      var touches = evt.changedTouches;
      var dx = touches[0].pageX - x;
      var dy = touches[0].pageY - y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS) {
        dragging = true;
      }
      for (var i = 0; i < touches.length; i++) {
        currentTouches.push({
          touch: touches[i]
        });
      }
      return false;
    });
    $(document).on("touchmove", function (evt) {
      var touches = evt.changedTouches;
      if (dragging) {
        var dx = touches[0].pageX - x;
        var dy = touches[0].pageY - y;
        var now = new Date().getTime();
        var dt = Math.max(now - lastTouch, 1) / 50;
        mx = dx / dt;
        my = dy / dt;
        x = touches[0].pageX;
        y = touches[0].pageY;
        update();
        lastTouch = now;
      }
      for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        currentTouches[idx].touch = touches[i];
      }
      return false;
    });
    $(document).on("touchend", function (evt) {
      dragging = false;
      var touches = evt.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        currentTouches.splice(idx, 1);
      }
      return false;
    });
    $(document).on("touchcancel", function (evt) {
      var touches = evt.changedTouches;
      dragging = false;
      for (var i = 0; i < touches.length; i++) {
        currentTouches.splice(i, 1);
      }
      return false;
    });

    // get the current acceleration
    $(window).on("devicemotion", function (event) {
      var a = event.accelerationIncludingGravity;
      // acceleration relative to device, need to adjust based on orientation
      if (window.orientation === 0) {
        ay = -a.y;
        ax = a.x;
      } else if (window.orientation === 90) {
        ay = -a.x;
        ax = -a.y;
      } else if (window.orientation === -90) {
        ay = a.x;
        ax = a.y;
      }
    });

    // every 10ms, update the ball
    var last = new Date().getTime();
    setInterval(function () {
      var now = new Date().getTime();
      var dt = (now - last) / 100;
      // ignore when page is not displayed for a while
      if (now > last + 100) {
        last = now;
        return;
      }
      last = now;
      // ignore acceleration while dragging
      if (dragging) { return; }

      // adjust acceleration to account for force of drag
      ax -= DRAG * mx;
      ay -= DRAG * my;

      // add incremental update to speed from measured acceleration
      mx += ax * dt;
      my += ay * dt;

      // handle bouncing off fingers
      for (var i = 0; i < currentTouches.length; i++) {
        var touch = currentTouches[i];
        var adjustedMx = mx;
        var adjustedMy = my;
        if (touch.lastX) {
          var touchDx = touch.touch.pageX - touch.lastX;
          var touchDy = touch.touch.pageY - touch.lastY;
          var touchMx = touchDx / dt;
          var touchMy = touchDy / dt;
          touch.mx = ((touch.mx || touchMx) * TOUCH_MOTION_DAMP) + ((1 - TOUCH_MOTION_DAMP) * touchMx);
          touch.my = ((touch.my || touchMy) * TOUCH_MOTION_DAMP) + ((1 - TOUCH_MOTION_DAMP) * touchMy);
          adjustedMx -= 2 * touch.mx;
          adjustedMy -= 2 * touch.my;
        }
        touch.lastX = touch.touch.pageX;
        touch.lastY = touch.touch.pageY;
        var dx = x - touch.touch.pageX;
        var dy = y - touch.touch.pageY;
        if (Math.sqrt(dx * dx + dy * dy) < (FINGER_RADIUS + BALL_RADIUS)) {
          var speed = BOUNCINESS * Math.sqrt(adjustedMx * adjustedMx + adjustedMy * adjustedMy);
          var normal = Math.atan2(dy, dx);
          var incoming = Math.atan2(-adjustedMy, -adjustedMx);
          var theta = normal - incoming;
          if (theta > -Math.PI / 2 && theta < Math.PI / 2) {
            var outgoing = normal + theta;
            mx = Math.cos(outgoing) * speed;
            my = Math.sin(outgoing) * speed;
          }
        }
      }

      // update position from calculated speed
      x += mx * dt;
      y += my * dt;

      // handle bouncing off the walls
      if (y <= BALL_RADIUS) {
        my = -my * BOUNCINESS;
        y = BALL_RADIUS;
      }
      if (y >= $win.height() - BALL_RADIUS) {
        my = -my * BOUNCINESS;
        y = $win.height() - BALL_RADIUS;
      }
      if (x <= BALL_RADIUS) {
        x = BALL_RADIUS;
        mx = -mx * BOUNCINESS;
      }
      if (x >= $win.width() - BALL_RADIUS) {
        mx = -mx * BOUNCINESS;
        x = $win.width() - BALL_RADIUS;
      }

      // finally, render the new position
      update();
    }, 10);
  }
});
