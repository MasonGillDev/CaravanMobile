# Location Tracking Architecture - Future Improvement Plan

## Current State

### Mobile Implementation
- Using `expo-location` with `watchPositionAsync`
- Continuous foreground tracking with distance-based updates (30m)
- Time interval: 5 minutes
- Accuracy: Balanced

### Current Issues
1. **Battery Drain**: Continuous GPS tracking is power-intensive
2. **Privacy Concerns**: Shows persistent blue location indicator on iOS, persistent notification on Android
3. **User Experience**: Appears invasive with constant location tracking visible to user

### Backend Architecture (Working Well)
The backend handles visit detection intelligently:
- **PostGIS geofencing** with 50-meter radius
- **State machine** that manages visit lifecycle:
  - Detects arrivals (entering geofence)
  - Tracks continuing visits
  - Detects departures (leaving geofence)
  - Handles venue switches
- **Quality scoring** based on dwell time
- **GPS accuracy filtering** (ignores readings > 50m accuracy)

Backend requires regular location updates to accurately detect geofence entries/exits.

---

## Proposed Future Architecture: CLVisit Hybrid Approach

### Core Concept
Use iOS's `CLVisit` API to detect when users arrive at significant locations, then perform short bursts of precise location tracking to determine if they're near a venue in the database.

### How It Works

```
1. CLVisit detects arrival at significant location (passive, battery-efficient)
   ↓
2. Triggers app in background
   ↓
3. App performs 30-60 second burst of precise GPS tracking
   ↓
4. Sends precise coordinates to backend
   ↓
5. Backend runs existing geofence query (50m radius)
   ↓
6. Backend state machine decides if this is a venue visit or just a random location
   ↓
7. App stops precise tracking, returns to passive monitoring
```

### Benefits

#### Battery Efficiency
- CLVisit uses cell tower + WiFi (minimal battery usage)
- Precise GPS only runs for 30-60 seconds per visit event
- 99% of the time: no active tracking
- CLVisit learns patterns and ignores frequently visited places (home, work)

#### Privacy & User Experience
- No persistent blue location indicator
- Only momentary GPS bursts when CLVisit triggers
- Less invasive appearance to users

#### Reliability
- CLVisit is system-level, survives app force quit
- Background delivery wakes app when needed
- More reliable than app-level background tasks

#### Accuracy
- CLVisit gets user "close enough" (within 100-200m)
- Precise GPS burst provides exact coordinates
- Backend's existing 50m geofence logic works perfectly
- Backend filters false positives (random locations without venues)

### Edge Cases Handled

| Scenario | How It's Handled |
|----------|------------------|
| User at random location (park, home) | CLVisit triggers → precise check → backend finds no nearby places → no visit created |
| User at restaurant | CLVisit triggers → precise check → backend finds place within 50m → visit created |
| Quick coffee run | CLVisit detects arrival + departure → two precise bursts → backend calculates dwell time |
| User force quits app | CLVisit continues monitoring, queues events for delivery when app reopens |

---

## Implementation Overview

### iOS Component

**Native Module Required:**
- Create Swift module to interface with `CLLocationManager.startMonitoringVisits()`
- Listen for `CLLocationManagerDelegate.didVisit` callbacks
- Trigger precise location burst on visit events
- Send events to React Native layer

**Key APIs:**
```swift
locationManager.startMonitoringVisits()  // Start passive monitoring

func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
    // 1. Send visit event to React Native
    // 2. Request precise location (kCLLocationAccuracyBest)
    // 3. Collect 3-5 readings over 30-60 seconds
    // 4. Stop precise tracking
}
```

### React Native Integration

**VisitMonitoringService:**
- Start CLVisit monitoring
- Handle visit arrival/departure events
- Coordinate precise location bursts
- Send data to backend

**Precise Location Burst:**
- Use `Location.Accuracy.BestForNavigation`
- Collect 3-5 readings over 30-60 seconds
- Select most accurate reading
- Send to backend with context (visit trigger type)

### Backend Changes

**Minimal changes required** - existing architecture handles everything:
- Continue using existing geofence query (50m radius)
- Existing state machine handles visit lifecycle
- Optional: Add logging for visit trigger types (analytics)

```go
// Optional new field in location update
type LocationUpdateRequest struct {
    Latitude  float64
    Longitude float64
    Accuracy  float64
    Trigger   string  // "visit_arrival", "visit_departure", "manual", "background"
}
```

---

## Android Alternative

Since CLVisit is iOS-only, Android needs a different approach:

### Option A: Activity Recognition + Geofencing
- Use Activity Recognition API to detect when user stops moving
- Trigger precise location burst when user becomes stationary
- Similar battery characteristics to CLVisit

### Option B: Significant Location Changes
- Use coarse location updates (500m intervals)
- Cell tower + WiFi based
- Less accurate but more battery efficient
- May miss some visits

### Option C: Geofencing API
- Download nearby places periodically
- Set up Android geofences (limited to 100 per app)
- Update geofences as user moves
- More complex but more accurate

---

## Migration Strategy

### Phase 1: Proof of Concept
1. Create iOS native module for CLVisit
2. Test visit detection reliability
3. Measure battery impact of precise bursts
4. Validate backend compatibility

### Phase 2: iOS Rollout
1. Implement full iOS CLVisit integration
2. Keep current approach as fallback
3. A/B test with subset of users
4. Monitor metrics: battery usage, visit accuracy, user feedback

### Phase 3: Android Implementation
1. Evaluate Android alternatives based on iOS learnings
2. Implement chosen approach
3. Ensure feature parity between platforms

### Phase 4: Deprecation
1. Gradually migrate all users to new system
2. Remove old `watchPositionAsync` implementation
3. Monitor for issues and rollback if needed

---

## Comparison: Current vs. Proposed

| Aspect | Current (watchPositionAsync) | Proposed (CLVisit Hybrid) |
|--------|------------------------------|---------------------------|
| **Battery Usage** | High (continuous GPS) | Low (passive + short bursts) |
| **Location Indicator** | Persistent blue bar/notification | Momentary, non-persistent |
| **Survives Force Quit** | No | Yes (iOS), Depends (Android) |
| **Update Frequency** | Every 30m movement or 5 min | On significant location change |
| **Accuracy** | Medium (Balanced accuracy) | High (precise bursts) |
| **Implementation** | Simple (Expo APIs) | Complex (native modules) |
| **Cross-Platform** | Unified approach | Platform-specific solutions |
| **Privacy Perception** | Invasive | Less invasive |

---

## Open Questions

1. **Android parity**: Which Android approach provides best balance of battery/accuracy/reliability?
2. **Fallback behavior**: What happens if CLVisit doesn't trigger for extended periods?
3. **User settings**: Should users be able to choose tracking mode (battery saver vs. accurate)?
4. **Notification strategy**: How to communicate location usage to users transparently?
5. **Testing**: How to test visit detection reliability without waiting for real-world visits?

---

## Decision

**Status**: Proposed for future implementation
**Priority**: Medium (current system works, but has UX concerns)
**Complexity**: High (requires native modules, platform-specific logic)
**Impact**: High (better battery life, improved user perception of privacy)

This architecture represents a significant improvement in battery efficiency and user experience while maintaining the accuracy needed for the backend's geofencing logic. Implementation should be done carefully with thorough testing and gradual rollout.
