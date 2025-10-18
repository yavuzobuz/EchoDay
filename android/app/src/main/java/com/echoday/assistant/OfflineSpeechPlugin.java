package com.echoday.assistant;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Log;
import java.util.ArrayList;

@CapacitorPlugin(name = "OfflineSpeech")
public class OfflineSpeechPlugin extends Plugin {
    private static final String TAG = "OfflineSpeechPlugin";
    
    private OfflineSpeechRecognizer offlineRecognizer;
    
    @Override
    public void load() {
        super.load();
        Log.d(TAG, "OfflineSpeech plugin loaded");
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = OfflineSpeechRecognizer.isOfflineRecognitionAvailable(getContext());
        
        JSObject result = new JSObject();
        result.put("available", available);
        
        Log.d(TAG, "Offline speech availability: " + available);
        call.resolve(result);
    }
    
    @PluginMethod
    public void startListening(PluginCall call) {
        if (offlineRecognizer == null) {
            offlineRecognizer = new OfflineSpeechRecognizer(getContext());
            setupRecognizerListener();
        }
        
        // Get parameters
        boolean preferOffline = call.getBoolean("preferOffline", true);
        String language = call.getString("language", "tr-TR");
        
        Log.d(TAG, "Starting offline speech recognition - preferOffline: " + preferOffline + ", language: " + language);
        
        try {
            offlineRecognizer.startListening(preferOffline, language);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start offline speech recognition", e);
            call.reject("Failed to start recognition: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void stopListening(PluginCall call) {
        if (offlineRecognizer != null) {
            offlineRecognizer.stopListening();
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void cancel(PluginCall call) {
        if (offlineRecognizer != null) {
            offlineRecognizer.cancel();
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void isListening(PluginCall call) {
        boolean listening = offlineRecognizer != null && offlineRecognizer.isListening();
        
        JSObject result = new JSObject();
        result.put("listening", listening);
        call.resolve(result);
    }
    
    private void setupRecognizerListener() {
        if (offlineRecognizer == null) return;
        
        offlineRecognizer.setListener(new OfflineSpeechRecognizer.OfflineSpeechListener() {
            @Override
            public void onResults(ArrayList<String> results) {
                Log.d(TAG, "Final results received: " + results);
                
                JSObject data = new JSObject();
                data.put("results", results);
                data.put("isFinal", true);
                
                notifyListeners("speechResults", data);
            }
            
            @Override
            public void onPartialResults(String partialResult) {
                Log.d(TAG, "Partial result: " + partialResult);
                
                JSObject data = new JSObject();
                data.put("text", partialResult);
                data.put("isFinal", false);
                
                notifyListeners("speechPartialResults", data);
            }
            
            @Override
            public void onError(int errorCode, String errorMessage) {
                Log.e(TAG, "Speech recognition error: " + errorCode + " - " + errorMessage);
                
                JSObject data = new JSObject();
                data.put("error", errorMessage);
                data.put("errorCode", errorCode);
                
                // Special handling for common errors
                switch (errorCode) {
                    case 7: // ERROR_NO_MATCH
                        data.put("isNoMatch", true);
                        data.put("shouldShowError", false);
                        break;
                    case 6: // ERROR_SPEECH_TIMEOUT  
                        data.put("isTimeout", true);
                        data.put("shouldShowError", false);
                        break;
                    case 5: // ERROR_SERVER
                        data.put("isServerError", true);
                        data.put("shouldShowError", true);
                        data.put("suggestOffline", true);
                        break;
                    case 2: // ERROR_NETWORK
                        data.put("isNetworkError", true);
                        data.put("shouldShowError", true);
                        data.put("suggestOffline", true);
                        break;
                    default:
                        data.put("shouldShowError", true);
                        break;
                }
                
                notifyListeners("speechError", data);
            }
            
            @Override
            public void onReadyForSpeech() {
                Log.d(TAG, "Ready for speech");
                
                JSObject data = new JSObject();
                data.put("status", "ready");
                
                notifyListeners("speechStateChange", data);
            }
            
            @Override
            public void onBeginningOfSpeech() {
                Log.d(TAG, "Beginning of speech detected");
                
                JSObject data = new JSObject();
                data.put("status", "speaking");
                
                notifyListeners("speechStateChange", data);
            }
            
            @Override
            public void onEndOfSpeech() {
                Log.d(TAG, "End of speech detected");
                
                JSObject data = new JSObject();
                data.put("status", "ended");
                
                notifyListeners("speechStateChange", data);
            }
        });
    }
    
    @Override
    protected void handleOnDestroy() {
        if (offlineRecognizer != null) {
            offlineRecognizer.destroy();
            offlineRecognizer = null;
        }
        super.handleOnDestroy();
    }
}