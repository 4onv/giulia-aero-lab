"""Render the Giulia lab's original 690T sound study (NumPy and FFmpeg).

No sampled or manufacturer audio is used. Fire sequence from Stellantis
eLearn, Giulia Quadrifoglio 2.9 V6 biturbo (service news 952925033).
Gianluca Pivetti describes the alternating 90/150 degree intervals in
https://www.autotecnica.org/alfa-romeo-tecnica-v6-510-cv/

Usage: python tools/render_engine.py [path/to/ffmpeg]
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np


RATE = 44100
DEST = Path(__file__).resolve().parents[1] / "dist/assets/engine"
PROFILE = {
    "ignition": 0.54, "revStart": 2.24, "idleStart": 5.80, "idleLength": 4.80,
    "curve": [[0, 0], [.08, 130], [.30, 220], [.54, 270], [.65, 760],
              [.87, 1500], [1.15, 1340], [1.78, 880], [2.24, 805],
              [2.44, 1050], [2.82, 2330], [3.17, 3760], [3.44, 4260],
              [3.60, 4020], [3.97, 2950], [4.47, 1740], [4.96, 1020],
              [5.38, 839], [5.80, 800]],
}


def smooth_curve(t, knots):
    times, levels = np.array(knots).T
    # Monotone cubic Hermite: changing slope without a hold at each knot.
    slope = np.diff(levels) / np.diff(times)
    deriv = np.zeros(len(times))
    for k in range(1, len(times) - 1):
        if slope[k - 1] * slope[k] > 0:
            deriv[k] = 2 / (1/slope[k - 1] + 1/slope[k])
    i = np.clip(np.searchsorted(times, t) - 1, 0, len(times) - 2)
    width = times[i + 1] - times[i]
    x = np.clip((t - times[i]) / width, 0, 1)
    return ((1 - 3*x*x + 2*x**3)*levels[i] + (3*x*x - 2*x**3)*levels[i+1]
            + width*((x - 2*x*x + x**3)*deriv[i] + (x**3 - x*x)*deriv[i+1]))


def delay(x, seconds):
    n = int(seconds * RATE)
    return np.pad(x[:-n], (n, 0))


def cabinet(x, modes, low_cut, high_cut):
    # Parallel damped pipe resonances and microphone rolloff in the frequency domain.
    n = 1 << (len(x) + RATE // 4).bit_length()
    hz = np.fft.rfftfreq(n, 1/RATE)
    transfer = np.ones(len(hz), dtype=complex)
    for centre, q, gain in modes:
        s = 1j * hz / centre
        transfer += gain * (s / q) / (1 + s/q + s*s)
    transfer *= (1j*hz / (low_cut+1j*hz))**2 / (1+1j*hz/high_cut)**2
    return np.fft.irfft(np.fft.rfft(x, n)*transfer, n)[:len(x)]


def render():
    rng = np.random.default_rng(690)
    idle = PROFILE["idleStart"]
    period = PROFILE["idleLength"]
    end = idle + period
    n = round((end+.24)*RATE)
    t = np.arange(n)/RATE
    rpm = smooth_curve(t, PROFILE["curve"])
    idle_colour = (np.sin(2*np.pi*(t-idle)*4/period)*13
                   + np.sin(2*np.pi*(t-idle)*7/period)*4.5)
    rpm += idle_colour*np.clip((t-.7)*2, 0, 1)
    turns = np.cumsum(rpm / (RATE*120))
    throttle = np.interp(t, [0,.49,.65,.85,1.25,1.82,2.24,2.42,2.82,3.34,3.48,3.68,4.54,5.5],
                         [0,0,.45,.65,.38,.13,.12,.48,.84,.96,.91,.17,.12,.10])
    banks = np.zeros((2,n))
    mechanical = np.zeros(n)
    # Two crank rotations per cycle, with three evenly spaced pulses per turbo.
    sequence = [(1,0), (6,90), (3,240), (4,330), (2,480), (5,570)]
    for cylinder, angle in sequence:
        piston = turns - angle/720
        firings = np.flatnonzero(np.diff(np.floor(piston)) > 0) + 1
        bank = int(cylinder > 3)
        for i in firings:
            ignition = np.clip((t[i] - .48)/.22, 0, 1)
            load = throttle[i]
            strength = (.32 + .68*load)*(.37+.63*ignition)
            strength *= (.95+.025*cylinder)*rng.uniform(.86,1.14)
            pos = i + round(RATE*(.0024+.00021*(cylinder%3)))
            m = min(round(.047*RATE), n-pos)
            if m < 1:
                continue
            tau = np.arange(m)/RATE
            width = .0035 + .0023*load + .00028*(cylinder%3)
            jet = (1-np.exp(-tau/.00043))*np.exp(-tau/width)
            reflected = (1-np.exp(-tau/.003))*np.exp(-tau/.010)
            hiss = rng.standard_normal(m)
            pulse = jet - .42*reflected + jet*hiss*(.095+.22*load)
            banks[bank,pos:pos+m] += strength*pulse*ignition
            knock = np.sin(2*np.pi*(635+18*cylinder)*tau)*np.exp(-tau/.0029)
            mechanical[pos:pos+m] += strength*knock*.38

    # A near-field view of two tailpipes. Pipe lengths differ slightly from
    # bank to bank, and the intake opens into the high-mid register under load.
    tails = []
    for side, raw in enumerate(banks):
        raw = raw - .35*delay(raw,.0015+side*.00031) + .42*delay(raw,.0054+side*.00064)
        raw += .17*delay(raw,.0117+side*.0013)
        modes = [(86+side*6,1.7,1.6), (163+side*11,1.9,1.45),
                 (326+side*19,2.3,1.05), (530+side*32,2.7,.84), (1030+side*43,1.8,.50)]
        tails.append(cabinet(raw, modes, 27, 3800))
    motor = cabinet(mechanical, [(820,1.6,.65),(2400,1.6,.28)], 220,3400)
    air = cabinet(rng.standard_normal(n), [(810,.95,.8),(2310,1.1,.6)], 260,2800)
    spool = np.interp(t,[0,2.40,3.00,3.43,3.56,3.80,4.30,5.05],[0,0,.015,.05,.11,.075,.018,0])
    air = air*(.0026+.026*throttle**2+spool*.31)*np.clip((t-.50)*9,0,1)

    starter = smooth_curve(t,[(0,0),(.035,1),(.50,.84),(.63,.25),(.69,0)])
    geared = np.cumsum((45+rpm*.71)/RATE)*2*np.pi
    compression = .37+.63*(.5+.5*np.cos(turns*12*np.pi))**1.5
    whirr = (np.sin(geared)+.35*np.sin(2*geared)+.21*np.sin(4*geared))*.105
    starter *= compression*(whirr+cabinet(rng.standard_normal(n), [],350,2700)*.115)
    click = rng.standard_normal(n)*np.exp(-np.maximum(t-.017,0)/.008)*(t>=.017)
    starter += .21*cabinet(click,[(1530,2,.8)],350,4200)

    left = .76*tails[0]+.63*delay(tails[1],.00046)+.54*motor+air+starter
    right = .74*tails[1]+.64*delay(tails[0],.00041)+.50*delay(motor,.00017)+air+.90*starter
    stereo = np.stack((left+.065*delay(right,.027),right+.055*delay(left,.033)), axis=1)
    stereo = np.tanh(1.6*stereo)
    stereo *= .80/np.max(np.abs(stereo))
    # Copy the tail through the beginning of the loop; fade in the preceding
    # transition as well, so both the first pass and every repeat are continuous.
    a, b, w = round(idle*RATE), round(end*RATE), round(.16*RATE)
    blend = np.linspace(0,1,w)[:,None]
    stereo[a-w:a] = (1-blend)*stereo[a-w:a] + blend*stereo[b-w:b]
    stereo[a:a+w] = (1-blend)*stereo[b:b+w] + blend*stereo[a:a+w]
    # Keep encoder lookahead beyond loopEnd. Otherwise the MP3 encoder sees
    # silence in the final transform window and changes the loop boundary.
    pad = round(.12*RATE)
    stereo[b:b+pad] *= np.linspace(1, 0, pad)[:,None]
    return stereo[:b+pad]


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    audio = render()
    encoder = sys.argv[1] if len(sys.argv)>1 else "ffmpeg"
    subprocess.run([encoder, "-hide_banner","-loglevel","error","-y", "-f","f32le",
                    "-ar",str(RATE),"-ac","2","-i","pipe:0", "-c:a","libmp3lame",
                    "-b:a","128k",str(DEST/"giulia-v6.mp3")],
                   input=audio.astype("<f4").tobytes(), check=True)
    (DEST/"sequence.json").write_text(json.dumps(PROFILE, separators=(",",":"))+"\n",encoding="utf-8")
