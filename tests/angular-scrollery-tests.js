describe("angular-scrollery", function() {
    beforeEach(function() {
        module("angular-scrollery-config");
        module("angular-scrollery");
    });

    var scope;
    var scrollBehaviorElement;
    var broadcastMade = false;

    beforeEach(inject(function($compile, $rootScope) {
        scope = $rootScope.$new();
        // Set up mock directive
        var scrollBehaviorHtml = "<div class='scrolling-animation' scroll-behavior " +
            "animations='[[{0: {translateY: [0, 100]}, 1: {opacity: [0, 1], rotate: [0, 100]}" +
            "}]]'></div>";
        var containerHtml = "<div class='scrolling-animation'></div>";
        var containerElement = $compile(angular.element(containerHtml))($rootScope.$new());
        containerElement.appendTo(document.body);
        scrollBehaviorElement = angular.element(scrollBehaviorHtml);
        scrollBehaviorElement.appendTo(containerElement);
        scrollBehaviorElement = $compile(scrollBehaviorElement)($rootScope.$new());
        scrollBehaviorElement.isolateScope().$on("YChanged", function(event, y, newStep, oldStep) {
            broadcastMade = true;
        });
        scope.$digest();
    }));

    afterEach(function() {
        scrollBehaviorElement.remove();
        broadcastMade = false;
    });

    // --- directiveNotifier service --- //
    describe("directiveNotifier service", function() {
        it("should return a function that broadcasts the YChanged event",
            inject(function(directiveNotifier) {
                directiveNotifier.notifyChange(1, 0, 0);
                expect(broadcastMade).toBe(true);
        }));
    });

    // --- windowScroll service --- //
    describe("windowScroll service", function() {
        it("should return a function that calls callback on scroll event",
            inject(function(windowScroll, $window) {
                var callbackCalled = false;

                function mockCallback() {
                    callbackCalled = true;
                };

                windowScroll.onScroll(mockCallback);
                var e = $.Event("scroll");
                $($window).triggerHandler(e);
                expect(callbackCalled).toEqual(true);
        }));
    });

    // --- stepStructure service --- //
    describe("stepStructure service", function() {
        var mockStepStructure;
        var steps;

        beforeEach(function() {
            inject(function(stepStructure) {
                mockStepStructure = stepStructure;
                steps = mockStepStructure.getStepStructure();
            });
        });

        it("should return a function that provides a step structure", function() {
            expect(typeof steps).toEqual(typeof []);
        });

        it("should return a function that provides step info for a give step", function() {
            for (var i = 0; i < steps.length; i ++) {
                var stepObj = mockStepStructure.getStepInfo(i);
                expect(stepObj.hasOwnProperty("name")).toBe(true);
                expect(stepObj.hasOwnProperty("start")).toBe(true);
                expect(stepObj.hasOwnProperty("duration")).toBe(true);
            }
        });

        it("should return a function that provides the last step number", function() {
            var lastStepNum = steps.length - 1;
            expect(mockStepStructure.getLastStep()).toEqual(lastStepNum);
        });

        it("should returna a function that provides the animation lenght", function() {
            var duration = 0;
            for (var i = 0; i < steps.length; i++) {
                duration += steps[i]["duration"];
            };
            expect(mockStepStructure.getAnimationLength()).toEqual(duration);
        });
    });

    // --- ScrollerController controller --- //
    describe("ScrollerController controller", function() {
        var mockStepStructure;

        beforeEach(inject(function($rootScope, $controller, stepStructure) {
            $controller("ScrollerController", {
                $scope: scope
            });
            mockStepStructure = stepStructure;
        }));

        it("should start an interval if isScrolling is false",
            inject(function($window) {
                expect(scope.intervalId).toEqual(0);
                expect(scope.isScrolling).toEqual(false);
                var e = $.Event("scroll");
                $($window).triggerHandler(e);
                expect(scope.intervalId).not.toEqual(0);
                scope.isScrolling = true;
                scope.intervalId = 0;
                $($window).triggerHandler(e);
                expect(scope.intervalId).toBe(0);
        }));

        it("provides a function that notifies directives of a change in Y if isScrolling is true",
            function() {
                scope.animateFrame(function() { scope.isScrolling = true; });
                expect(broadcastMade).toBe(true);
        });

        it("it provides a function that checks if the page is being scrolled", function() {
            expect(scope.isScrolling).toBe(false);
            scope.updateIsScrolling(10);
            expect(scope.isScrolling).toBe(true);
            scope.updateIsScrolling(10);
            expect(scope.isScrolling).toBe(false);
        });

        it("provides a function that updates the currentStep based on the scroll position",
            function() {
                expect(scope.currentStep).toEqual(0);
                var yVals = [50, 150, 250];
                for (var i = 0; i <= mockStepStructure.getLastStep(); i++) {
                    scope.updateStep(yVals[i]);
                    expect(scope.currentStep).toEqual(i);
                }
        });
    });

    // --- scrollBehavior directive --- //
    describe("scrollBehavior directive", function() {
        var mockStepStructure;

        beforeEach(inject(function(stepStructure) {
            mockStepStructure = stepStructure;
        }));

        it("should set up myAnimations and myProperties correctly", function() {
            expect(scrollBehaviorElement.isolateScope().myAnimations).toEqual(
                    {
                        0: {translateY: [0, 100]},
                        1: {opacity: [0, 1], rotate: [0, 100]}
                    }
                );
            expect(scrollBehaviorElement.isolateScope().myProperties).
                toEqual(["translateY", "opacity", "rotate"]);
        });

        it("should provide a function that returns a list of steps affected by a change in step",
            function() {
                // Test no change in step.
                var affectedSteps = [];
                affectedSteps = scrollBehaviorElement.isolateScope().getAffectedSteps(0, 0);
                expect(affectedSteps).toEqual([0]);
                // Test backward change in step, one step difference
                affectedSteps = scrollBehaviorElement.isolateScope().getAffectedSteps(0, 1);
                expect(affectedSteps).toEqual([1, 0]);
                // Test backward change in step, >1 step difference
                affectedSteps = scrollBehaviorElement.isolateScope().getAffectedSteps(1, 3);
                expect(affectedSteps).toEqual([3, 2, 1]);
                // Test forward change in step, one step difference
                affectedSteps = scrollBehaviorElement.isolateScope().getAffectedSteps(2, 1);
                expect(affectedSteps).toEqual([1, 2]);
                // Test forward change in step, >1 step difference
                affectedSteps = scrollBehaviorElement.isolateScope().getAffectedSteps(4, 0);
                expect(affectedSteps).toEqual([0, 1, 2, 3, 4]);
        });

        it("should applySteps on YChanged", inject(function(directiveNotifier) {
            // Normal forward scrolling: scrolling 90% through step 1
            directiveNotifier.notifyChange(90, 0, 0);
            expect(scrollBehaviorElement[0]["style"]["cssText"]).
                toContain("transform: translateY(90px);");
            directiveNotifier.notifyChange(110, 1, 0);
            expect(scrollBehaviorElement[0]["style"]["cssText"]).
                toContain("transform: rotate(10deg); opacity: 0.1;");
            // Normal backwards scrolling
            // Test that last step finished
            directiveNotifier.notifyChange(90, 0, 1);
            expect(scrollBehaviorElement[0]["style"]["cssText"]).
                toContain("transform: translateY(90px); opacity: 0;");
            // Greater than one step scrolling, middle step finishes
            directiveNotifier.notifyChange(250, 2, 0);
            expect(scrollBehaviorElement[0]["style"]["cssText"]).
                toContain("transform: rotate(100deg); opacity: 1;");
        }));
    });

});
