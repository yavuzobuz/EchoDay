package com.smarttodo.assistant;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Log for debugging
        android.util.Log.d("EchoDay", "MainActivity created - Capacitor initialized");
    }
}
