import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveSessionProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LiveSession: React.FC<LiveSessionProps> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    // Helpers from documentation
    const createBlob = (data: Float32Array): { data: string, mimeType: string } => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        let binary = '';
        const bytes = new Uint8Array(int16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return {
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const decodeAudio = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };

    const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length;
        const buffer = ctx.createBuffer(1, frameCount, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }
        return buffer;
    };

    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        let sessionPromise: Promise<any> | null = null;
        let nextStartTime = 0;
        
        const init = async () => {
            setStatus('connecting');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            setAudioContext(ac);
            const inputAC = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            // Setup Media
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // Canvas loop for video frames
            const ctx = canvasRef.current?.getContext('2d');
            const frameInterval = setInterval(() => {
                if (!active || !ctx || !videoRef.current || !sessionPromise) return;
                
                canvasRef.current!.width = videoRef.current.videoWidth;
                canvasRef.current!.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);
                
                const base64Data = canvasRef.current!.toDataURL('image/jpeg', 0.5).split(',')[1];
                
                sessionPromise.then(session => {
                    session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                    });
                });

            }, 500); // 2 FPS to save bandwidth

            // Connect Live
            sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("Live Connected");
                        setStatus('connected');
                        
                        // Setup Audio Input
                        const source = inputAC.createMediaStreamSource(stream);
                        const processor = inputAC.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            if (!active) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const blob = createBlob(inputData);
                            sessionPromise!.then(session => {
                                session.sendRealtimeInput({ media: blob });
                            });
                        };
                        source.connect(processor);
                        processor.connect(inputAC.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const audioStr = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioStr) {
                            nextStartTime = Math.max(nextStartTime, ac.currentTime);
                            const bytes = decodeAudio(audioStr);
                            const buffer = await decodeAudioData(bytes, ac);
                            const source = ac.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ac.destination);
                            source.start(nextStartTime);
                            nextStartTime += buffer.duration;
                        }
                    },
                    onclose: () => setStatus('disconnected'),
                    onerror: (e) => console.error(e)
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: "Your name is SmartGPT. You are an advanced AI from the SmartGPT app. You can see and hear the user. Always identify yourself as SmartGPT.",
                }
            });

            return () => {
                active = false;
                clearInterval(frameInterval);
                stream.getTracks().forEach(t => t.stop());
                ac.close();
                inputAC.close();
            }
        };

        const cleanup = init();

        return () => {
            cleanup.then(c => c && c());
        };

    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md">
            <div className="w-full max-w-4xl p-4 flex flex-col items-center">
                <div className="relative border-2 border-cyan-500 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                    <video ref={videoRef} className="w-full h-auto" muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute bottom-4 left-4 bg-black/60 px-4 py-2 rounded-full text-white backdrop-blur">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        {status === 'connected' ? 'SmartGPT Live Active' : 'Connecting...'}
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition-all transform hover:scale-105 shadow-lg"
                >
                    End Session
                </button>
            </div>
        </div>
    );
};