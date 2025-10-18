package com.echoday.assistant;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "EchoDay";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // NOT: OfflineSpeechPlugin removed - using @capacitor-community/speech-recognition instead
        // registerPlugin(OfflineSpeechPlugin.class); // REMOVED - was conflicting
        
        // Enhanced debugging for speech recognition troubleshooting
        Log.d(TAG, "=== ANDROID MAIN ACTIVITY DEBUG ===");
        Log.d(TAG, "MainActivity created - Capacitor initialized");
        Log.d(TAG, "Using @capacitor-community/speech-recognition plugin");
        Log.d(TAG, "Speech Recognition will be auto-registered by Capacitor");
        
        // Check and request microphone permission
        checkAndRequestPermissions();
        
        Log.d(TAG, "App is ready for speech recognition testing");
        Log.d(TAG, "========================================");
    }
    
    private void checkAndRequestPermissions() {
        // Android 6.0 (API 23) ve üstü için runtime permission kontrolü
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean hasMicPermission = ContextCompat.checkSelfPermission(
                this, 
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED;
            
            Log.d(TAG, "Microphone permission status: " + (hasMicPermission ? "GRANTED" : "NOT GRANTED"));
            
            if (!hasMicPermission) {
                Log.d(TAG, "Requesting microphone permission...");
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_CODE
                );
            } else {
                Log.d(TAG, "Microphone permission already granted");
            }
        } else {
            Log.d(TAG, "Android version < 6.0, runtime permissions not required");
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "✅ Microphone permission GRANTED by user");
            } else {
                Log.e(TAG, "❌ Microphone permission DENIED by user");
                Log.e(TAG, "Speech recognition will NOT work without microphone permission!");
            }
        }
    }
}
