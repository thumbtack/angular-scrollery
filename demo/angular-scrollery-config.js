(function() {
"use strict";

var app = angular.module("angular-scrollery-config", []);

app.service("scrolleryConfig", function() {
    // steps is an array of objects formatted like: {name: "stepName", start: 0, duration: 200}
    var steps = [
        {
            name: "fireAppear",
            start: 0,
            duration: 200
        },
        {
            name: "smokeAppear",
            start: 200,
            duration: 200
        },
        {
            name: "rocketLaunch",
            start: 400,
            duration: 400
        },
        {
            name: "theEnd",
            start: 800,
            duration: 100
        }
    ];
    // For a one-time animation
    var animateOnlyOnce = false;
    // The end (in DOM height) of the animation (for one-time animation only)
    var animationEnd = undefined;
    for (var i = 0; i < steps.length; i++) {
        animationEnd += steps[i]["duration"];
    }
    return {
        getSteps: function() {
            return steps;
        },
        getAnimationOnlyOnce: function() {
            return animateOnlyOnce;
        },
        getAnimationEnd: function() {
            return animationEnd;
        }
    };
});
})();

