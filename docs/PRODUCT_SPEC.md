# PA Tuning Wizard — Product Specification

## 1. Product goal

PA Tuning Wizard is a Windows desktop companion application for Open Sound Meter (OSM). It does not replace OSM. OSM remains the measurement engine. PA Tuning Wizard consumes OSM measurement data and turns professional PA tuning into a guided, beginner-proof workflow.

The design principle is:

> Tell the user what to physically do. Measure it. Decide whether the data is trustworthy. Recommend one change. Measure again. Prove that the change helped.

The product must be powerful enough for professional system alignment while being simple enough that an inexperienced operator can follow the wizard without understanding phase wrapping, transfer functions, coherence, acoustic crossover behavior, or delay math.

## 2. Product modes

### Wizard Mode

Default mode. One decision at a time. Plain-language instructions. The user is told which sources to mute/unmute, where to place the mic, when to measure, and what DSP change to make. The app blocks unsafe or invalid analysis.

### Engineer Mode

Advanced view showing the underlying magnitude, phase, coherence, delay, crossover range, stored measurements, before/after comparison, confidence scores, and calculation rationale. Engineer Mode may allow expert overrides, but Wizard Mode guardrails remain the default behavior.

## 3. v0.1 scope

Version 0.1 supports:

- one measurement microphone
- one measurement/reference pair from OSM
- one Main source
- one Sub source
- optional Left + Right main workflow
- optional mono or left/right sub topology description
- locally running Open Sound Meter
- pink-noise measurement workflow
- magnitude data
- phase data
- coherence data
- delay data
- SPL display if OSM is calibrated
- raw measurement capture
- common timing-reference enforcement
- automatic acoustic crossover detection
- main/sub phase comparison
- polarity candidate evaluation
- delay recommendation
- user-applied DSP changes
- before/after verification
- combined-response summation verification
- multi-position audience measurements
- conservative EQ recommendations
- project save/load
- final report generation

Version 0.1 does NOT directly control Tesira, Powersoft Armonía, Lake, Q-SYS, DriveRack, X32/M32, Allen & Heath, or other DSP platforms. It tells the user what to change.

## 4. Core workflow

### 4.1 Connection

The app attempts to connect to OSM automatically or via configurable host/port if necessary.

Show simple status:

- OSM Connected / Not Connected
- Measurement signal present
- Reference signal present
- Measurement quality Ready / Not Ready

The app should not begin tuning until it has confirmed that OSM data is arriving in a usable form.

### 4.2 System setup

Wizard questions:

- What are you tuning? Main + Sub
- Main topology: one main / left + right
- Sub topology: mono / left + right
- DSP platform: Tesira / Powersoft Armonía / Q-SYS / Lake / DriveRack / Console DSP / Other

DSP selection is informational in v0.1 and may customize text instructions later.

### 4.3 Measurement setup

Guide the user through:

- microphone connected
- measurement input selected in OSM
- reference selected in OSM
- mic orientation according to manufacturer
- mic placed at ear height in the reference listening position
- pink-noise generator ready

### 4.4 Level check

Guide:

> Turn on MAIN only. Keep SUB off. Start pink noise.

Monitor and validate:

- reference level
- measurement level
- clipping
- coherence/SNR where available
- SPL if calibrated

Show beginner-facing results such as GOOD / TOO LOW / CLIPPING rather than requiring interpretation of raw dBFS numbers.

Once valid, tell the user not to change microphone gain, generator level, console input gain, or other reference-critical levels for the remainder of comparative measurements.

## 5. Main timing reference

With Main only playing:

- observe OSM delay estimate
- determine whether delay is stable
- require stability before continuing
- capture the accepted timing reference
- label internally as ALIGNMENT_REFERENCE_DELAY

Example:

```text
289.18
289.19
289.18
289.20
289.19
```

Pass.

Example:

```text
289
305
270
292
315
```

Fail.

If timing is unstable, stop and tell the user to verify source isolation, measurement level, and reference quality.

Once accepted, Wizard Mode must treat this timing reference as locked for main/sub phase comparison.

## 6. Main capture

With Main only:

- use the accepted timing reference
- wait for averaging/stability
- validate coherence
- store a Main alignment measurement

Minimum stored fields:

- role = main
- timing reference
- timestamp
- frequency array
- magnitude array
- phase array
- coherence array
- SPL if available
- quality metadata

## 7. Sub capture using the SAME timing reference

Guide:

> Mute MAIN. Turn SUB on. Do not run Delay Finder again.

The wizard must ensure the Sub measurement is analyzed against the exact same timing reference used for Main.

If timing references differ, phase comparison is invalid and must be blocked.

User-facing warning:

> These measurements do not share the same timing reference. Re-measure the Sub.

This guardrail is mandatory.

## 8. Acoustic crossover detection

Do not simply choose the first mathematical intersection of Main and Sub magnitude traces.

Search for an overlap region where:

- both measurements have adequate coherence
- both sources have meaningful acoustic output
- Main is transitioning downward toward LF
- Sub is transitioning downward toward HF
- magnitude difference is reasonably small through part of the overlap region
- the region is physically plausible

Return:

- lower crossover bound
- upper crossover bound
- estimated acoustic crossover center
- confidence score

Beginner view:

> Crossover detected: ~81 Hz

Engineer view:

> Valid overlap: 72–91 Hz, center 80.7 Hz, confidence 0.91

## 9. Phase analysis

Compare phase throughout the crossover band, not only at one frequency.

For valid bins:

```text
phaseDifference = wrapTo180(subPhase - mainPhase)
```

Weight bins using:

- Main coherence
- Sub coherence
- proximity/relevance to acoustic crossover
- optionally relative magnitude overlap

Calculate a weighted phase error across the crossover region.

## 10. Polarity evaluation

Always evaluate both candidates:

- normal sub polarity
- inverted sub polarity (+180° phase transform)

For each candidate, calculate the timing correction that minimizes weighted crossover phase error.

Do not recommend polarity inversion merely because one point appears closer. Compare the broadband crossover result.

## 11. Delay optimization

Delay recommendation must minimize phase error across the full crossover region.

Do not derive final delay solely from one frequency using `t = phi / (360f)`.

Use deterministic search/optimization across a bounded candidate delay range, for example ±10 ms initially, with configurable resolution.

For every candidate delay:

- predict phase rotation by frequency
- calculate weighted residual phase error
- score result

Choose the best physically reasonable candidate.

Then determine which source must be delayed. Since delay can only make a source later, the app must correctly tell the user whether to add delay to Main or Sub based on relative arrival.

Example beginner output:

> Add 2.0 ms delay to MAIN. Keep Sub polarity NORMAL. Make this change in your DSP, then click Measure Again.

## 12. Never trust prediction without measurement

After the user applies the recommendation, re-measure.

Measured result always outranks theoretical prediction.

Compare:

- weighted phase error before
- weighted phase error after
- crossover shape before/after

If worse:

> That change made alignment worse. Restore the previous setting. Another solution will be calculated.

If improved:

> Phase alignment improved significantly.

## 13. Combined summation verification

Guide:

> Turn MAIN and SUB on together.

Capture combined response using the same reference position and valid timing context.

Compare:

- Main alone
- Sub alone
- Main + Sub

Measure constructive summation throughout crossover.

At equal individual levels and near-perfect alignment, theoretical maximum approaches +6 dB. The app should not require +6 dB everywhere.

Provisional v0.1 quality classes:

### Excellent

- weighted phase error <= 15°
- average crossover summation >= 4.5 dB
- adequate coherence

### Good

- weighted phase error <= 30°
- average crossover summation >= 3 dB

### Needs improvement

- phase error > 30°
- or summation < 3 dB

### Invalid

- poor coherence
- clipping
- unstable timing
- inadequate SNR
- mismatched timing reference

These thresholds must be configurable and later field-tested.

## 14. Multi-position measurement

After alignment passes, guide the user through audience measurements such as:

- Position 1 — reference / mix position
- Position 2 — front
- Position 3 — rear
- Position 4 — off-axis

Each position gets its own appropriate delay compensation because this stage is for spatial response/EQ analysis, not relative main/sub phase comparison.

The user should not manually manage trace names in Wizard Mode. The app labels them automatically.

## 15. EQ decision engine

The EQ engine must be conservative.

Distinguish repeatable system response from spatial interference.

Example likely system issue:

```text
250 Hz
P1 +4.8
P2 +5.1
P3 +4.4
P4 +5.3
```

Low variance and broad repeatable excess: high-confidence EQ candidate.

Example likely spatial problem:

```text
630 Hz
P1 -10
P2 +5
P3 -3
P4 +7
```

High variance: do not EQ globally.

Rules:

- prefer cuts
- avoid boosts into deep nulls
- avoid narrow corrections for position-dependent interference
- avoid correction where coherence is poor
- avoid frequencies outside useful source bandwidth
- reject extreme corrections by default
- require re-measurement after applied EQ

Example recommendation:

> 247 Hz, -3.5 dB, Q 1.4, Confidence HIGH

## 16. Guardrails

Wizard Mode must block or warn on:

### Poor coherence

> Measurement quality is poor in the crossover region. No alignment recommendation will be made.

### Clipping

> Measurement input is clipping. Reduce measurement preamp gain.

### Wrong timing references

> Main and Sub do not share the same timing reference. Phase comparison blocked.

### Deep null

> A deep narrow cancellation is present. No EQ boost recommended.

### Excessive proposed delay

If optimization proposes a physically suspicious value, do not blindly recommend it. Require additional verification.

### Prediction fails verification

If expected summation does not occur acoustically, reject the theoretical solution and retry.

## 17. User experience requirements

Default Wizard Mode should avoid jargon whenever possible.

Prefer:

> Add 2.0 ms delay to MAIN.

Instead of:

> Main/sub phase offset is +57.6° at Fc.

Provide `Show me why` to expose technical detail.

The wizard should use strong stateful instructions such as:

> MAIN ON
> SUB OFF

and require the user to confirm physical changes before continuing.

The app should remember what it previously asked the user to do and should not issue contradictory instructions.

## 18. Final report

Save:

- project/system name
- date/time
- measurement topology
- initial Main response
- initial Sub response
- detected crossover
- initial phase error
- recommended polarity
- delay change
- verified phase error
- summation result
- audience-position measurements
- EQ recommendations
- final response
- unresolved warnings

Report export can initially be HTML/PDF later. v0.1 must at minimum save the project and provide a structured summary.

## 19. Non-goals for v0.1

Do not build:

- a replacement measurement engine for OSM
- direct DSP control
- automatic destructive writes to processors
- AI-based acoustic decision making
- complex cardioid sub-array design
- delay-tower/fill alignment beyond basic future-ready architecture
- multi-microphone spatial statistics beyond basic single-mic repeated positions

## 20. Decision-engine philosophy

Core acoustic decisions must be deterministic and testable.

AI may later explain results in plain language, but AI must not be responsible for the primary calculations for delay, polarity, crossover, coherence validation, summation, or EQ confidence.

Every important recommendation must be reproducible from stored measurement data and unit-testable logic.
