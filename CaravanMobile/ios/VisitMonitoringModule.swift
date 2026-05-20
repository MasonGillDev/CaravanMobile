import Foundation
import CoreLocation
import React

@objc(VisitMonitoringModule)
class VisitMonitoringModule: RCTEventEmitter, CLLocationManagerDelegate {

  private var locationManager: CLLocationManager?
  private var hasListeners = false

  override init() {
    super.init()
    setupLocationManager()
  }

  private func setupLocationManager() {
    locationManager = CLLocationManager()
    locationManager?.delegate = self
    locationManager?.allowsBackgroundLocationUpdates = true
    locationManager?.pausesLocationUpdatesAutomatically = false
  }

  // MARK: - React Native Methods

  @objc
  func startMonitoringVisits(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let locationManager = locationManager else {
      reject("NO_LOCATION_MANAGER", "Location manager not initialized", nil)
      return
    }

    // Check if visit monitoring is available
    guard CLLocationManager.significantLocationChangeMonitoringAvailable() else {
      reject("VISIT_MONITORING_UNAVAILABLE", "Visit monitoring not available on this device", nil)
      return
    }

    // Start monitoring visits
    locationManager.startMonitoringVisits()
    NSLog("[VisitMonitoring] Started monitoring visits")

    resolve(["success": true])
  }

  @objc
  func stopMonitoringVisits(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let locationManager = locationManager else {
      reject("NO_LOCATION_MANAGER", "Location manager not initialized", nil)
      return
    }

    locationManager.stopMonitoringVisits()
    NSLog("[VisitMonitoring] Stopped monitoring visits")

    resolve(["success": true])
  }

  @objc
  func requestAlwaysAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let locationManager = locationManager else {
      reject("NO_LOCATION_MANAGER", "Location manager not initialized", nil)
      return
    }

    locationManager.requestAlwaysAuthorization()
    NSLog("[VisitMonitoring] Requested always authorization")

    resolve(["success": true])
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
    NSLog("[VisitMonitoring] Visit detected: arrival=\(visit.arrivalDate), departure=\(visit.departureDate)")

    // Convert visit to dictionary
    let visitData: [String: Any] = [
      "latitude": visit.coordinate.latitude,
      "longitude": visit.coordinate.longitude,
      "horizontalAccuracy": visit.horizontalAccuracy,
      "arrivalDate": ISO8601DateFormatter().string(from: visit.arrivalDate),
      "departureDate": visit.departureDate == Date.distantFuture ? NSNull() : ISO8601DateFormatter().string(from: visit.departureDate)
    ]

    // Send event to React Native
    if hasListeners {
      sendEvent(withName: "onVisitDetected", body: visitData)
    }
  }

  func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    NSLog("[VisitMonitoring] Authorization status changed: \(status.rawValue)")

    if hasListeners {
      let authStatus: String
      switch status {
      case .notDetermined:
        authStatus = "notDetermined"
      case .restricted:
        authStatus = "restricted"
      case .denied:
        authStatus = "denied"
      case .authorizedAlways:
        authStatus = "authorizedAlways"
      case .authorizedWhenInUse:
        authStatus = "authorizedWhenInUse"
      @unknown default:
        authStatus = "unknown"
      }

      sendEvent(withName: "onAuthorizationChanged", body: ["status": authStatus])
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    NSLog("[VisitMonitoring] Location manager error: \(error.localizedDescription)")

    if hasListeners {
      sendEvent(withName: "onError", body: ["error": error.localizedDescription])
    }
  }

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    return ["onVisitDetected", "onAuthorizationChanged", "onError"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
