package com.echoday.assistant;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.Locale;

public class OfflineSpeechRecognizer {
    private static final String TAG = "OfflineSpeechRecognizer";
    
    private Context context;
    private SpeechRecognizer speechRecognizer;
    private OfflineSpeechListener listener;
    private boolean isListening = false;
    
    public interface OfflineSpeechListener {
        void onResults(ArrayList<String> results);
        void onPartialResults(String partialResult);
        void onError(int errorCode, String errorMessage);
        void onReadyForSpeech();
        void onBeginningOfSpeech();
        void onEndOfSpeech();
    }
    
    public OfflineSpeechRecognizer(Context context) {
        this.context = context;
        this.speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context);
    }
    
    public void setListener(OfflineSpeechListener listener) {
        this.listener = listener;
        setupRecognitionListener();
    }
    
    private void setupRecognitionListener() {
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                Log.d(TAG, "Ready for speech");
                if (listener != null) listener.onReadyForSpeech();
            }
            
            @Override
            public void onBeginningOfSpeech() {
                Log.d(TAG, "Beginning of speech");
                if (listener != null) listener.onBeginningOfSpeech();
            }
            
            @Override
            public void onRmsChanged(float rmsdB) {
                // Audio level changed - can be used for voice activity detection
            }
            
            @Override
            public void onBufferReceived(byte[] buffer) {
                // Raw audio data - can be used for custom processing
            }
            
            @Override
            public void onEndOfSpeech() {
                Log.d(TAG, "End of speech");
                isListening = false;
                if (listener != null) listener.onEndOfSpeech();
            }
            
            @Override
            public void onError(int error) {
                Log.e(TAG, "Speech recognition error: " + error);
                isListening = false;
                String errorMessage = getErrorMessage(error);
                if (listener != null) listener.onError(error, errorMessage);
            }
            
            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                Log.d(TAG, "Final results: " + matches);
                isListening = false;
                if (listener != null && matches != null) {
                    listener.onResults(matches);
                }
            }
            
            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    String partialResult = matches.get(0);
                    Log.d(TAG, "Partial result: " + partialResult);
                    if (listener != null) listener.onPartialResults(partialResult);
                }
            }
            
            @Override
            public void onEvent(int eventType, Bundle params) {
                Log.d(TAG, "Speech event: " + eventType);
            }
        });
    }
    
    public void startListening(boolean preferOffline, String language) {
        if (isListening) {
            Log.w(TAG, "Already listening");
            return;
        }
        
        Log.d(TAG, "Starting speech recognition - Offline: " + preferOffline + ", Language: " + language);
        
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        
        // Set language
        if (language != null && !language.isEmpty()) {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
        } else {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "tr-TR");
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "tr-TR");
        }
        
        // Enable partial results for real-time feedback
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        
        // Prefer offline recognition if available
        if (preferOffline) {
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            Log.d(TAG, "Requesting offline speech recognition");
        }
        
        // Improve recognition accuracy
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.getPackageName());
        
        // Audio source optimization for better quality
        intent.putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", new String[]{"tr", "en"});
        
        try {
            speechRecognizer.startListening(intent);
            isListening = true;
            Log.d(TAG, "Speech recognition started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start speech recognition", e);
            if (listener != null) {
                listener.onError(-1, "Failed to start: " + e.getMessage());
            }
        }
    }
    
    public void stopListening() {
        if (speechRecognizer != null && isListening) {
            Log.d(TAG, "Stopping speech recognition");
            speechRecognizer.stopListening();
            isListening = false;
        }
    }
    
    public void cancel() {
        if (speechRecognizer != null) {
            Log.d(TAG, "Cancelling speech recognition");
            speechRecognizer.cancel();
            isListening = false;
        }
    }
    
    public boolean isListening() {
        return isListening;
    }
    
    public void destroy() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
            listener = null;
        }
    }
    
    public static boolean isOfflineRecognitionAvailable(Context context) {
        return SpeechRecognizer.isRecognitionAvailable(context);
    }
    
    private String getErrorMessage(int errorCode) {
        switch (errorCode) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "Audio recording error";
            case SpeechRecognizer.ERROR_CLIENT:
                return "Client side error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Insufficient permissions";
            case SpeechRecognizer.ERROR_NETWORK:
                return "Network error";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "No speech input matched";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Recognition service busy";
            case SpeechRecognizer.ERROR_SERVER:
                return "Server error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "No speech input";
            default:
                return "Unknown error: " + errorCode;
        }
    }
}