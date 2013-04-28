/*global $*/
$(function () {
  "use strict";
  // constants
  var BOUNCINESS = 0.9;
  var DRAG = 0.025;

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

  if (!window.DeviceOrientationEvent) {
    $(document.body).text("Your browser does not support geolocation");
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
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        dragging = true;
      }
      return false;
    });
    $(document).on("touchmove", function (evt) {
      if (dragging) {
        var touches = evt.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          var dx = touches[0].pageX - x;
          var dy = touches[0].pageY - y;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            var now = new Date().getTime();
            var dt = (now - lastTouch) / 100;
            mx = dx / dt;
            my = dy / dt;
            x = touches[0].pageX;
            y = touches[0].pageY;
            update();
            lastTouch = now;
          }
        }
      }
      return false;
    });
    $(document).on("touchend", function () {
      dragging = false;
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

      // update position from calculated speed
      x += mx * dt;
      y += my * dt;

      // handle bouncing off the walls
      if (y <= 40) {
        my = -my * BOUNCINESS;
        y = 40;
      }
      if (y >= $win.height() - 40) {
        my = -my * BOUNCINESS;
        y = $win.height() - 40;
      }
      if (x <= 40) {
        x = 40;
        mx = -mx * BOUNCINESS;
      }
      if (x >= $win.width() - 40) {
        mx = -mx * BOUNCINESS;
        x = $win.width() - 40;
      }

      // finally, render the new position
      update();
    }, 10);
  }
});