import {
  AnimationClip,
  NumberKeyframeTrack
} from 'three';

// Map from AWS Polly viseme phonemes to your model's blendshape names
const pollyToBlendshapeMap = {
  'sil': 'mouthClose',
  'p': 'mouthPucker',
  'b': 'mouthPucker',
  'm': 'mouthPucker',
  'f': 'mouthFunnel',
  'v': 'mouthFunnel',
  'th': 'mouthStretch',
  's': 'mouthSmile', // Assuming mouthSmile is a unified blendshape
  'z': 'mouthSmile',
  'sh': 'mouthSmile',
  'ch': 'mouthSmile',
  'jh': 'mouthSmile',
  'y': 'mouthSmile',
  'l': 'mouthShrugUpper',
  'r': 'mouthRollUpper',
  'w': 'mouthFunnel',
  'q': 'mouthShrugLower',
  'k': 'jawOpen',
  'g': 'jawOpen',
  'ng': 'jawOpen',
  'h': 'jawOpen',
  'ae': 'mouthShrugLower',
  'ah': 'jawOpen',
  'ao': 'mouthFunnel',
  'aw': 'mouthPucker',
  'ay': 'jawOpen',
  'eh': 'mouthShrugLower',
  'er': 'mouthShrugLower',
  'ey': 'mouthShrugUpper',
  'ih': 'mouthShrugUpper',
  'iy': 'mouthSmile',
  'ow': 'mouthPucker',
  'oy': 'mouthPucker',
  'uh': 'mouthShrugLower',
  'uw': 'mouthFunnel',
  'd': 'mouthShrugUpper',
  't': 'mouthShrugUpper',
  'n': 'mouthShrugUpper',
};

// This function modifies the blendshape key to match the naming convention in the model.
function modifiedKey(key) {
  if (["eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight"].includes(key)) {
    return key;
  }
  if (key.endsWith("Right")) {
    return key.replace("Right", "_R");
  }
  if (key.endsWith("Left")) {
    return key.replace("Left", "_L");
  }
  return key;
}

function createAnimation(recordedData, morphTargetDictionary, bodyPart) {
  if (!recordedData || recordedData.length === 0) {
    console.error("Recorded data is empty or invalid.");
    return null;
  }

  const tracks = {};
  const animationDuration = recordedData[recordedData.length - 1].time / 1000;
  const holdTime = 0.5;
  const totalDuration = animationDuration + holdTime;

  recordedData.forEach(event => {
    const time = event.time / 1000;
    Object.entries(event.blendshapes).forEach(([key, value]) => {
      // Use the map to get the correct blendshape name
      const blendshapeName = pollyToBlendshapeMap[key] || key; 
      const modified = modifiedKey(blendshapeName);
      const morphIndex = morphTargetDictionary[modified];

      if (morphIndex !== undefined) {
        if (!tracks[modified]) {
          tracks[modified] = {
            name: `${bodyPart}.morphTargetInfluences[${morphIndex}]`,
            times: [0],
            values: [0]
          };
        }
        
        const finalValue = parseFloat(value) || 0;
        
        tracks[modified].times.push(time);
        tracks[modified].values.push(finalValue);
      }
    });
  });

  Object.keys(tracks).forEach(key => {
    const track = tracks[key];
    const lastValue = track.values[track.values.length - 1];
    track.times.push(totalDuration);
    track.values.push(lastValue);
  });

  const threeJsTracks = Object.values(tracks).map(trackData => {
    return new NumberKeyframeTrack(trackData.name, trackData.times, trackData.values);
  });
  
  const clip = new AnimationClip(`${bodyPart}_Animation`, totalDuration, threeJsTracks);
  return clip;
}

export default createAnimation;