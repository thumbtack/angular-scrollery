(function() {
"use strict";

var app = angular.module("angular-scrollery", ["angular-scrollery-config"]);

app.service("directiveNotifier", ["$rootScope", function($rootScope) {
    return {
        notifyChange: function(y, step, oldStep) {
            $rootScope.$broadcast("YChanged", y, step, oldStep);
        }
    }
}]);

app.service("windowScroll", ["$window", function($window) {
    return {
        onScroll: function(callback) {
            $($window).on("scroll", callback);
        }
    }
}]);

app.service("stepStructure", ["scrolleryConfig", function(scrolleryConfig) {
    var steps = scrolleryConfig.getSteps();
    return {
        getStepStructure: function() {
            return steps;
        },
        getStepInfo: function(step) {
            return steps[step];
        },
        getLastStep: function() {
            return steps.length - 1;
        },
        getAnimationLength: function() {
            var duration = 0;
            for (var i = 0; i < steps.length; i++) {
                duration += steps[i]["duration"];
            };
            return duration;
        }
    }
}]);

app.controller("ScrollerController", [
    "$scope", "$window", "$interval", "directiveNotifier", "windowScroll", "stepStructure",
    function($scope, $window, $interval, directiveNotifier, windowScroll, stepStructure) {
        // $scope.currentY holds the value of the number of pixels the user has scrolled from the
        // top of the page
        // $scope.currentStep holds the index of the current step in the animation, based on
        // $scope.currentY
        $scope.isScrolling = false;
        $scope.currentY = 0;
        $scope.currentStep = 0;

        windowScroll.onScroll(function() {
            if (!$scope.isScrolling) {
                $scope.intervalId = $interval($scope.animateFrame, 1000 / 30);
            }
        });

        $scope.animateFrame = function() {
            // Called by interval.  Notifies directives of change in Y.
            $scope.updateIsScrolling();
            if ($scope.isScrolling) {
                var oldStep = $scope.currentStep;
                $scope.updateStep($scope.currentY);
                directiveNotifier.notifyChange($scope.currentY, $scope.currentStep, oldStep);
            }
        };

        $scope.updateIsScrolling = function() {
            var newY = $window.scrollY;
            if (Math.abs(newY - $scope.currentY) > 1) {
                if (newY < 0) {
                    // Protects against negative "bounce"
                    $scope.currentY = 0;
                } else {
                    $scope.currentY = newY;
                }
                $scope.isScrolling = true;
            } else {
                $scope.isScrolling = false;
                $interval.cancel();
            }
        };

        $scope.updateStep = function(y) {
            if (y <= 0) {
                $scope.currentStep = 0;
            } else if (y >= stepStructure.getAnimationLength()) {
                $scope.currentStep = stepStructure.getLastStep();
            } else {
                var steps = stepStructure.getStepStructure();
                for (var i = 0; i < steps.length; i++) {
                    var step = steps[i];
                    if (y > step["start"] && y < (step["start"] + step["duration"])) {
                        $scope.currentStep = i;
                    }
                };
            }
        };
    }
]);

app.directive("scrollBehavior", ["stepStructure", function(stepStructure) {
    // This directive is added to elements under ScrollerController that have any animation applied.
    function link(scope, element, attrs) {
        // Sets up myAnimations and myProperties from the animations attribute on scope.
        var myAnimations = angular.fromJson(scope.animations),
            myProperties = [];
        angular.forEach(myAnimations, function(animationsObject, step) {
            angular.forEach(animationsObject, function(value, animationProperty) {
                myProperties.push(animationProperty);
            });
        });

        scope.$on("YChanged", function(event, y, newStep, oldStep) {
            // YChanged is broadcast from the directiveNotifier service.
            var affectedSteps = getAffectedSteps(newStep, oldStep),
                direction = newStep > oldStep ? 1 : 0; // 1 = forward
            if (affectedSteps.length > 0) {
                applySteps(newStep, y, affectedSteps, direction);
            }
        });

        function getAffectedSteps(newStep, oldStep) {
            // Makes a list of steps that should be changed.
            // Pushes steps on in order that they should be applied.
            var affectedSteps = [];
            if (newStep > oldStep) {
                for (var i = oldStep; i <= newStep; i++) {
                    affectedSteps.push(i);
                };
            } else {
                for (var i = oldStep; i >= newStep; i--) {
                    affectedSteps.push(i);
                };
            }
            return affectedSteps;
        };

        function applySteps(newStep, y, affectedSteps, direction) {
            if (affectedSteps.length > 1) { // If steps other than newStep need to be changed.
                for (var i = 0; i < affectedSteps.length - 1; i++) {
                    var newStyles = calcNewStyles(affectedSteps[i], y, true, direction);
                    applyStyles(newStyles);
                };
            }
            var newStyles = calcNewStyles(newStep, y);
            applyStyles(newStyles);
        };

        function calcNewStyles(step, y, finish, direction) {
            var newStyles = [],
                animations = myAnimations[step],
                stepInfo = stepStructure.getStepInfo(step),
                oldVal = null,
                newVal = null;
            angular.forEach(animations, function(propValues, animationProp) {
                if (finish === true) {
                    newVal = propValues[direction];
                    if (direction === 1) {
                        oldVal = propValues[0];
                    } else {
                        oldVal = propValues[1];
                    }
                } else if (animationProp === "class") {
                    newVal = propValues[1];
                    oldVal = propValues[0];
                } else if (myProperties.indexOf(animationProp) > -1) {
                    var percentage = (y - stepInfo["start"]) / stepInfo["duration"],
                        difference = Math.abs( Math.abs(propValues[0]) - Math.abs(propValues[1])),
                        sign = propValues[0] > propValues[1] ? "-" : "+",
                        change = percentage * difference;
                    if (sign === "-") {
                        newVal = propValues[0] - change;
                    } else {
                        newVal = propValues[0] + change;
                    }
                } else {
                    throw new Error("Animation property ", animationProp, " is not supported.");
                }
                newStyles.push({
                    "newVal" : newVal,
                    "prop": animationProp,
                    "oldVal": oldVal
                });
            });
            return newStyles;
        };

        function applyStyles(styles) {
            for (var i = styles.length - 1; i >= 0; i--) {
                var style = styles[i],
                    prop = style["prop"],
                    newVal = style["newVal"],
                    oldVal = style["oldVal"];
                if (prop == "translateY" || prop == "rotate") {
                    var transform = prop + "(" + newVal;
                    if (prop == "rotate") {
                        transform += "deg)";
                    } else {
                        transform += "px)";
                    }
                    element.css({"-webkit-transform": transform });
                    element.css({"-moz-transform": transform });
                    element.css({"-o-transform": transform });
                    element.css({"-ms-transform": transform });
                    element.css({"transform": transform });
                } else if (prop == "class") {
                    element.addClass(newVal);
                    element.removeClass(oldVal);
                } else {
                    element.css({"opacity": newVal});
                }
            };
        };
    };

    return {
        restrict: "A",
        scope: {
            animations: "@"
        },
        link: link
    }
}]);

})();

