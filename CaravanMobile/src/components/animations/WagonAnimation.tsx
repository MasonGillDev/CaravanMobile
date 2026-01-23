import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ======= YOU TUNE THESE =======
const BODY_DISPLAY = 60; // on-screen size of the 594x594 cabin image (square)
const BODY_PX = 594; // source cabin png px
const WHEEL_DISPLAY = 21; // on-screen wheel diameter (try 46–60)

// Wheel centers measured in CABIN (594x594) space (REPLACE with your real values)
const BACK_WHEEL_CENTER_PX = { x: 110, y: 490 };
const FRONT_WHEEL_CENTER_PX = { x: 345, y: 495 };

// Ground / vertical placement
const BOTTOM_OFFSET = 20; // how far from bottom of parent container

// Animation configuration
const HORIZONTAL_SPEED = 7000; // Higher = slower (ms to cross screen)
const HORIZONTAL_SPEED_BOOSTED = 2000; // Speed when tapped
const BOUNCE_SPEED = 800;
const BOUNCE_SPEED_BOOSTED = 400;
const BOUNCE_HEIGHT = 6;
const BOUNCE_HEIGHT_BOOSTED = 10;
const WHEEL_ROTATION_SPEED = 600;
const WHEEL_ROTATION_SPEED_BOOSTED = 200;

// Dust cloud configuration
const DUST_CLOUD_SIZE = 80; // Size of each dust cloud
const DUST_PULSE_DURATION = 600; // ms for dust to pulse in/out
const DUST_OPACITY_MAX = 0.3; // Maximum opacity for dust clouds

// Random event timing (min and max seconds between wagon appearances)
const MIN_WAIT_TIME = 500000; // 5 seconds
const MAX_WAIT_TIME = 1500000; // 15 seconds

export const WagonAnimation: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [goingRight, setGoingRight] = useState(true);
  const [isBoosted, setIsBoosted] = useState(false);
  const [showDust, setShowDust] = useState(false);

  const startXLeft = -BODY_DISPLAY - 40;
  const endXRight = SCREEN_WIDTH + 40;
  const startXRight = SCREEN_WIDTH + 40;
  const endXLeft = -BODY_DISPLAY - 40;

  const translateX = useRef(new Animated.Value(startXLeft)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const tiltRotation = useRef(new Animated.Value(0)).current; // For wheelie effect
  const dustOpacity = useRef(new Animated.Value(0)).current; // Dust cloud opacity
  const dustScale = useRef(new Animated.Value(0.5)).current; // Dust cloud scale

  const horizontalAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const wheelAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const dustAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const scale = useMemo(() => BODY_DISPLAY / BODY_PX, []);

  // Convert 594-space centers -> display-space top-left
  const backWheelLeft = useMemo(
    () => BACK_WHEEL_CENTER_PX.x * scale - WHEEL_DISPLAY / 2,
    [scale]
  );
  const backWheelTop = useMemo(
    () => BACK_WHEEL_CENTER_PX.y * scale - WHEEL_DISPLAY / 2,
    [scale]
  );

  const frontWheelLeft = useMemo(
    () => FRONT_WHEEL_CENTER_PX.x * scale - WHEEL_DISPLAY / 2,
    [scale]
  );
  const frontWheelTop = useMemo(
    () => FRONT_WHEEL_CENTER_PX.y * scale - WHEEL_DISPLAY / 2,
    [scale]
  );

  const startDustClouds = () => {
    setShowDust(true);

    // Pulsing dust cloud animation
    const dustAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dustOpacity, {
            toValue: DUST_OPACITY_MAX,
            duration: DUST_PULSE_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dustScale, {
            toValue: 1.2,
            duration: DUST_PULSE_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dustOpacity, {
            toValue: 0.3,
            duration: DUST_PULSE_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dustScale, {
            toValue: 0.8,
            duration: DUST_PULSE_DURATION,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    dustAnimRef.current = dustAnimation;
    dustAnimation.start();
  };

  const stopDustClouds = () => {
    dustAnimRef.current?.stop();
    setShowDust(false);
    dustOpacity.setValue(0);
    dustScale.setValue(0.5);
  };

  const handleTap = () => {
    if (isBoosted) return; // Already boosted

    setIsBoosted(true);

    // Stop current animations
    horizontalAnimRef.current?.stop();
    bounceAnimRef.current?.stop();
    wheelAnimRef.current?.stop();

    // Start dust clouds
    startDustClouds();

    // Wheelie animation - buck back onto rear wheels
    const wheelieAnimation = Animated.sequence([
      // Quick tilt back
      Animated.timing(tiltRotation, {
        toValue: -15, // Tilt back 15 degrees
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Hold briefly
      Animated.delay(100),
      // Fall back down
      Animated.timing(tiltRotation, {
        toValue: 0,
        duration: 200,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]);

    wheelieAnimation.start();

    // Get current position
    const currentX = (translateX as any)._value;
    const endX = goingRight ? endXRight : endXLeft;

    // Calculate remaining distance and new duration proportionally
    const remainingDistance = Math.abs(endX - currentX);
    const totalDistance = Math.abs(endXRight - startXLeft);
    const remainingRatio = remainingDistance / totalDistance;
    const newDuration = HORIZONTAL_SPEED_BOOSTED * remainingRatio;

    // Start boosted animations
    const horizontalAnimation = Animated.timing(translateX, {
      toValue: endX,
      duration: newDuration,
      useNativeDriver: true,
    });

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -BOUNCE_HEIGHT_BOOSTED,
          duration: BOUNCE_SPEED_BOOSTED / 2,
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: BOUNCE_SPEED_BOOSTED / 2,
          useNativeDriver: true,
        }),
      ])
    );

    const wheelAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(wheelRotation, {
          toValue: 1,
          duration: WHEEL_ROTATION_SPEED_BOOSTED,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wheelRotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    horizontalAnimRef.current = horizontalAnimation;
    bounceAnimRef.current = bounceAnimation;
    wheelAnimRef.current = wheelAnimation;

    bounceAnimation.start();
    wheelAnimation.start();

    horizontalAnimation.start(({ finished }) => {
      if (finished) {
        setIsVisible(false);
        setIsBoosted(false);
        tiltRotation.setValue(0);
        bounceAnimation.stop();
        wheelAnimation.stop();
        stopDustClouds();
        scheduleNextWagon();
      }
    });
  };

  const scheduleNextWagon = () => {
    const randomWait = Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME) + MIN_WAIT_TIME;

    setTimeout(() => {
      // Randomly choose direction
      const shouldGoRight = Math.random() > 0.5;
      setGoingRight(shouldGoRight);
      setIsBoosted(false);

      // Set starting position based on direction
      translateX.setValue(shouldGoRight ? startXLeft : startXRight);

      // Show the wagon
      setIsVisible(true);

      // Start animations
      const endX = shouldGoRight ? endXRight : endXLeft;

      const horizontalAnimation = Animated.timing(translateX, {
        toValue: endX,
        duration: HORIZONTAL_SPEED,
        useNativeDriver: true,
      });

      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceY, {
            toValue: -BOUNCE_HEIGHT,
            duration: BOUNCE_SPEED / 2,
            useNativeDriver: true,
          }),
          Animated.timing(bounceY, {
            toValue: 0,
            duration: BOUNCE_SPEED / 2,
            useNativeDriver: true,
          }),
        ])
      );

      const wheelAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(wheelRotation, {
            toValue: 1,
            duration: WHEEL_ROTATION_SPEED,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(wheelRotation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      horizontalAnimRef.current = horizontalAnimation;
      bounceAnimRef.current = bounceAnimation;
      wheelAnimRef.current = wheelAnimation;

      bounceAnimation.start();
      wheelAnimation.start();

      horizontalAnimation.start(({ finished }) => {
        if (finished) {
          // Hide wagon and stop animations
          setIsVisible(false);
          bounceAnimation.stop();
          wheelAnimation.stop();

          // Schedule next wagon
          scheduleNextWagon();
        }
      });
    }, randomWait);
  };

  useEffect(() => {
    // Start the first wagon
    scheduleNextWagon();
  }, []);

  const wheelRotate = wheelRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={handleTap}>
        <Animated.View
          style={[
            styles.group,
            {
              width: BODY_DISPLAY,
              height: BODY_DISPLAY,
              transform: [
                { translateX },
                { scaleX: goingRight ? 1 : -1 }, // Flip horizontally when going left
                { rotate: tiltRotation.interpolate({
                    inputRange: [-15, 0],
                    outputRange: ['-15deg', '0deg'],
                  })
                },
              ],
            },
          ]}
        >
        {/* Cabin (bounces) */}
        <Animated.View style={{ transform: [{ translateY: bounceY }] }}>
          <Image
            source={require('../../../assets/cabin.png')}
            style={{ width: BODY_DISPLAY, height: BODY_DISPLAY }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Dust clouds - attached to back wheel */}
        {showDust && (
          <>
            <Animated.Image
              source={require('../../../assets/dust-cloud1.png')}
              resizeMode="contain"
              style={{
                position: 'absolute',
                width: DUST_CLOUD_SIZE,
                height: DUST_CLOUD_SIZE,
                left: backWheelLeft - (DUST_CLOUD_SIZE - WHEEL_DISPLAY) / 2,
                top: backWheelTop - (DUST_CLOUD_SIZE - WHEEL_DISPLAY) / 2,
                opacity: dustOpacity,
                transform: [{ scale: dustScale }],
              }}
            />
            <Animated.Image
              source={require('../../../assets/dust-cloud2.png')}
              resizeMode="contain"
              style={{
                position: 'absolute',
                width: DUST_CLOUD_SIZE,
                height: DUST_CLOUD_SIZE,
                left: frontWheelLeft - (DUST_CLOUD_SIZE - WHEEL_DISPLAY) / 2,
                top: frontWheelTop - (DUST_CLOUD_SIZE - WHEEL_DISPLAY) / 2,
                opacity: dustOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5], // Front wheel dust is lighter
                }),
                transform: [{ scale: dustScale }],
              }}
            />
          </>
        )}

        {/* Wheels (do NOT bounce) */}
        <Animated.Image
          source={require('../../../assets/back-wheel.png')}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width: WHEEL_DISPLAY,
            height: WHEEL_DISPLAY,
            left: backWheelLeft,
            top: backWheelTop,
            transform: [{ rotate: wheelRotate }],
          }}
        />
        <Animated.Image
          source={require('../../../assets/front-wheel.png')}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width: WHEEL_DISPLAY,
            height: WHEEL_DISPLAY,
            left: frontWheelLeft,
            top: frontWheelTop,
            transform: [{ rotate: wheelRotate }],
          }}
        />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 65, // Position above the tab bar (70px height + 25px bottom offset)
    height: BODY_DISPLAY + BOTTOM_OFFSET,
    overflow: 'hidden',
    zIndex: 1000,
  },
  group: {
    position: 'absolute',
    bottom: BOTTOM_OFFSET,
  },
});
