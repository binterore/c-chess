import type { Move } from '../types/chess';

class SoundManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private noiseBuffer: AudioBuffer | null = null;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.72 : 0, this.context.currentTime, 0.02);
    }
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  private createNoiseBuffer(): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, context.sampleRate * 0.7, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private tone(
    frequency: number,
    duration: number,
    gainAmount: number,
    type: OscillatorType = 'sine',
    delay = 0,
    endFrequency?: number
  ): void {
    if (!this.context || !this.master || !this.enabled) return;
    const began = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, began);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), began + duration);
    gain.gain.setValueAtTime(0.0001, began);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), began + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, began + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(began);
    oscillator.stop(began + duration + 0.03);
  }

  private noise(duration: number, gainAmount: number, frequency: number, delay = 0, q = 0.7): void {
    if (!this.context || !this.master || !this.noiseBuffer || !this.enabled) return;
    const began = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, began);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), began + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, began + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(began);
    source.stop(began + duration + 0.02);
  }

  select(): void {
    if (!this.context || !this.master || !this.enabled) return;
    this.tone(360, 0.04, 0.08, 'sine', 0, 480);
    this.noise(0.025, 0.035, 1200, 0, 1.4);
  }

  move(move: Move): void {
    if (move.captured) {
      this.capture(move);
      return;
    }
    this.snapWood(false);
    if (move.givesCheck) this.check();
  }

  private snapWood(heavy: boolean): void {
    if (!this.context || !this.master || !this.enabled) return;
    const clickGain = heavy ? 0.32 : 0.22;
    const bodyGain = heavy ? 0.36 : 0.26;
    const bodyFreq = heavy ? 160 : 210;
    const endFreq = heavy ? 65 : 85;

    this.noise(0.025, clickGain, 3200, 0, 1.8);
    this.noise(0.04, clickGain * 0.6, 1400, 0.005, 1.2);
    this.tone(bodyFreq, 0.09, bodyGain, 'triangle', 0.002, endFreq);
    this.tone(bodyFreq * 0.55, 0.11, bodyGain * 0.45, 'sine', 0.004, 45);
  }

  private capture(move: Move): void {
    this.snapWood(true);
    this.noise(0.06, 0.18, 750, 0.015, 0.8);
    if (move.givesCheck) this.check();
  }

  check(): void {
    // Sharp sword-qi blade unsheathe glint
    this.tone(1480, 0.22, 0.14, 'triangle', 0, 2400);
    this.noise(0.08, 0.16, 2800, 0.005, 2.4);

    // Deep martial gong & resonance
    this.tone(186, 1.2, 0.22, 'sine', 0.02, 142);
    this.tone(279, 1.0, 0.14, 'triangle', 0.04, 206);
    this.tone(372, 0.85, 0.08, 'sine', 0.06, 280);
    this.noise(0.7, 0.12, 320, 0.02, 0.5);
  }

  victory(): void {
    [0, 0.13, 0.27, 0.42].forEach((delay, index) => {
      this.tone([146, 220, 293, 440][index], 0.8, 0.12, 'triangle', delay);
      this.tone([73, 110, 146.5, 220][index], 0.9, 0.06, 'sine', delay);
    });
    this.noise(0.8, 0.08, 580, 0.1, 0.4);
  }

  defeat(): void {
    this.tone(196, 0.75, 0.12, 'triangle', 0, 98);
    this.tone(147, 0.9, 0.1, 'sine', 0.2, 73);
  }

  draw(): void {
    this.tone(261, 0.8, 0.08, 'sine');
    this.tone(329, 0.8, 0.07, 'sine', 0.05);
  }

  tick(): void {
    this.tone(880, 0.035, 0.025, 'sine');
  }
}

export const soundManager = new SoundManager();
