import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from "../utils/audioUtils";
import { AssistantMode } from "../types";

interface LiveClientCallbacks {
  onOpen: () => void;
  onClose: (event: CloseEvent) => void;
  onError: (error: Error | ErrorEvent) => void;
  onAudioData: (volume: number) => void; // For visualization
  onModeChange: (mode: AssistantMode) => void;
}

const setModeTool: FunctionDeclaration = {
  name: 'setAssistantMode',
  description: 'Switches the assistant mode. Use this when the user explicitly asks for a specific mode like homework help, general knowledge quiz, science lab, or general assistance.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: {
        type: Type.STRING,
        description: 'The mode to switch to. Values: "HOMEWORK", "GENERAL", "GK_QUIZ", "SCIENCE".',
        enum: ['HOMEWORK', 'GENERAL', 'GK_QUIZ', 'SCIENCE']
      }
    },
    required: ['mode']
  }
};

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private stream: MediaStream | null = null;
  private session: any = null; // Session type isn't fully exported in all versions, using any for safety
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveClientCallbacks) {
    // Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            callbacks.onOpen();
            this.startAudioInput(sessionPromise, callbacks.onAudioData);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message, callbacks);
          },
          onclose: (e) => callbacks.onClose(e),
          onerror: (e) => callbacks.onError(e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, // Fenrir sounds deeper/calmer
          },
          systemInstruction: `You are JARVIS, a highly advanced, futuristic AI assistant. 
          Your personality is calm, precise, helpful, and safe. You are not emotional or romantic.
          
          CAPABILITIES:
          1. General Assistance: Answer questions, provide knowledge.
          2. Homework Help: You can switch to a specific homework mode.
          3. General Knowledge (GK) Quiz: You can conduct a quiz.
          4. Science Lab: You can discuss scientific theories, experiments, and analysis.
          
          RULES:
          - Speak clearly and concisely.
          - Keep responses short unless asked for details.
          - Always prioritize user safety.
          
          TOOLS:
          - You have a tool 'setAssistantMode'. 
          - If the user asks for "homework help", "study mode", call 'setAssistantMode' with 'HOMEWORK'.
          - If the user asks for "GK quiz", "general knowledge test", "ask me questions", call 'setAssistantMode' with 'GK_QUIZ'.
          - If the user asks for "science mode", "science lab", "talk about science", "biology", "physics", "chemistry", call 'setAssistantMode' with 'SCIENCE'.
          - If the user says "stop", "normal mode", "cancel", call 'setAssistantMode' with 'GENERAL'.

          BEHAVIOR IN HOMEWORK MODE:
          - Acknowledge: "Homework Protocol initiated."
          - IMMEDIATELY ask: "Please state the subject and your question."
          - Be academic, patient, and guiding. Explain concepts clearly.

          BEHAVIOR IN GK QUIZ MODE:
          - Acknowledge: "General Knowledge Database loaded. Initializing Quiz."
          - Start asking standard General Knowledge questions one by one (History, Geography, Science, Current Affairs).
          - Wait for the user's answer after each question.
          - If correct, say "Correct" and briefly add an interesting fact.
          - If incorrect, provide the correct answer and a brief explanation.
          - Then ask the next question immediately.

          BEHAVIOR IN SCIENCE MODE:
          - Acknowledge: "Science Lab Protocol initiated. Ready for analysis."
          - Act as a senior scientist/lab partner.
          - Focus on empirical data, scientific method, and deep explanations of phenomena (Physics, Biology, Chemistry, Astronomy).
          - If asked about experiments, emphasize safety precautions first.
          `,
          tools: [{ functionDeclarations: [setModeTool] }],
        },
      });

      this.session = sessionPromise;
      await sessionPromise;

    } catch (err) {
      callbacks.onError(err as Error);
    }
  }

  private startAudioInput(sessionPromise: Promise<any>, onAudioData: (vol: number) => void) {
    if (!this.inputAudioContext || !this.stream) return;

    this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    // Using ScriptProcessor as per guidelines for raw PCM access
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      onAudioData(rms * 100); // Scale up for easier UI handling

      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, callbacks: LiveClientCallbacks) {
    // Handle Tool Calls
    if (message.toolCall) {
      const functionCalls = message.toolCall.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const responses = [];
        for (const fc of functionCalls) {
           if (fc.name === 'setAssistantMode') {
              const args = fc.args as any;
              const mode = args.mode as AssistantMode;
              
              // Notify UI
              callbacks.onModeChange(mode);

              responses.push({
                id: fc.id,
                name: fc.name,
                response: { result: `Mode set to ${mode}` }
              });
           }
        }
        
        if (responses.length > 0) {
          this.session.then((session: any) => {
             session.sendToolResponse({ functionResponses: responses });
          });
        }
      }
    }

    // Handle Audio Output
    if (!this.outputAudioContext || !this.outputNode) return;

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
        // Ensure we are playing subsequent chunks after the previous ones
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

        const audioBuffer = await decodeAudioData(
            base64ToUint8Array(base64Audio),
            this.outputAudioContext,
            24000,
            1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
    }

    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
    }
  }

  private stopAllAudio() {
    this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    this.stopAllAudio();
    
    if (this.mediaStreamSource) this.mediaStreamSource.disconnect();
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();

    // No direct close method on the session object in the snippet, 
    // but stopping the stream and contexts effectively kills the loop.
  }
}