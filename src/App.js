import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";

import { Canvas, useFrame } from "@react-three/fiber";

import {
  useGLTF,
  useTexture,
  Loader,
  Environment,
  useFBX,
  useAnimations,
  OrthographicCamera,
} from "@react-three/drei";

import { MeshStandardMaterial } from "three/src/materials/MeshStandardMaterial";

import { LinearEncoding, sRGBEncoding } from "three/src/constants";

import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from "three";

import ReactAudioPlayer from "react-audio-player";

import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import createAnimation from "./converter";

import blinkData from "./blendDataBlink.json";

import "./App.css";

import * as THREE from "three";

import { GoogleGenerativeAI } from "@google/generative-ai";

import axios from "axios";

const _ = require("lodash");

// const VOICE_OPTIONS = [
//   { name: "Kore (Firm)", value: "Kore" },
//   { name: "Puck (Upbeat)", value: "Puck" },
//   { name: "Zephyr (Bright)", value: "Zephyr" },
//   { name: "Charon (Informative)", value: "Charon" },
//   { name: "Fenrir (Excitable)", value: "Fenrir" },
//   { name: "Leda (Youthful)", value: "Leda" },
//   { name: "Orus (Firm)", value: "Orus" },
//   { name: "Aoede (Breezy)", value: "Aoede" },
//   { name: "Callirrhoe (Easy-going)", value: "Callirrhoe" },
//   { name: "Autonoe (Bright)", value: "Autonoe" },
//   { name: "Enceladus (Breathy)", value: "Enceladus" },
//   { name: "Iapetus (Clear)", value: "Iapetus" },
//   { name: "Umbriel (Easy-going)", value: "Umbriel" },
//   { name: "Algieba (Smooth)", value: "Algieba" },
//   { name: "Despina (Smooth)", value: "Despina" },
//   { name: "Erinome (Clear)", value: "Erinome" },
//   { name: "Algenib (Gravelly)", value: "Algenib" },
//   { name: "Rasalgethi (Informative)", value: "Rasalgethi" },
//   { name: "Laomedeia (Upbeat)", value: "Laomedeia" },
//   { name: "Achernar (Soft)", value: "Achernar" },
//   { name: "Alnilam (Firm)", value: "Alnilam" },
//   { name: "Schedar (Even)", value: "Schedar" },
//   { name: "Gacrux (Mature)", value: "Gacrux" },
//   { name: "Pulcherrima (Forward)", value: "Pulcherrima" },
//   { name: "Achird (Friendly)", value: "Achird" },
//   { name: "Zubenelgenubi (Casual)", value: "Zubenelgenubi" },
//   { name: "Vindemiatrix (Gentle)", value: "Vindemiatrix" },
//   { name: "Sadachbia (Lively)", value: "Sadachbia" },
//   { name: "Sadaltager (Knowledgeable)", value: "Sadaltager" },
//   { name: "Sulafat (Warm)", value: "Sulafat" },
// ];

// A subset of valid AWS Polly voices
const VOICE_OPTIONS = [
    { name: "Joanna (US)", value: "Joanna" },
    { name: "Matthew (US)", value: "Matthew" },
    { name: "Salli (US)", value: "Salli" },
    { name: "Ivy (US)", value: "Ivy" },
    { name: "Kendra (US)", value: "Kendra" },
    { name: "Joey (US)", value: "Joey" },
    { name: "Amy (British)", value: "Amy" },
    { name: "Brian (British)", value: "Brian" },
    { name: "Emma (British)", value: "Emma" },
];

function Avatar({
  avatar_url,
  speak,
  setSpeak,
  text,
  setAudioSource,
  playing,
  setPlaying,
  callTtsApi,
  clips,
  onDictionariesReady,
}) {
  const gltf = useGLTF(avatar_url);
  const morphTargetDictionaryBodyRef = useRef(null);
  const morphTargetDictionaryLowerTeethRef = useRef(null);

  const [
    bodyTexture,
    eyesTexture,
    teethTexture,
    bodySpecularTexture,
    bodyRoughnessTexture,
    bodyNormalTexture,
    teethNormalTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
  ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuse.webp",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each(
    [
      bodyTexture,
      eyesTexture,
      teethTexture,
      teethNormalTexture,
      bodySpecularTexture,
      bodyRoughnessTexture,
      bodyNormalTexture,
      tshirtDiffuseTexture,
      tshirtNormalTexture,
      tshirtRoughnessTexture,
      hairAlphaTexture,
      hairNormalTexture,
      hairRoughnessTexture,
    ],
    (t) => {
      t.encoding = sRGBEncoding;
      t.flipY = false;
    }
  );

  bodyNormalTexture.encoding = LinearEncoding;
  tshirtNormalTexture.encoding = LinearEncoding;
  teethNormalTexture.encoding = LinearEncoding;
  hairNormalTexture.encoding = LinearEncoding;

  gltf.scene.traverse((node) => {
    if (
      node.type === "Mesh" ||
      node.type === "LineSegments" ||
      node.type === "SkinnedMesh"
    ) {
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;

      if (node.name.includes("Body")) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        node.material.roughness = 1.7;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);
        morphTargetDictionaryBodyRef.current = node.morphTargetDictionary;
        node.material.envMapIntensity = 0.8;
      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;
      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({ color: 0x000000 });
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {
        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;
        node.material.envMapIntensity = 0.7;
      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;
        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);
        node.material.envMapIntensity = 0.3;
      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeethRef.current = node.morphTargetDictionary;
      }
    }
  });

  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), []);

  let idleFbx = useFBX("/idle.fbx");
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, (track) => {
    return (
      track.name.includes("Head") ||
      track.name.includes("Neck") ||
      track.name.includes("Spine2")
    );
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, (track) => {
    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }
    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }
    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }
    return track;
  });

  useEffect(() => {
    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();
    let blinkClip = createAnimation(
      blinkData,
      morphTargetDictionaryBodyRef.current,
      "HG_Body"
    );
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();
  }, [mixer]);

  useEffect(() => {
    // This effect will run after the traverse has completed and the dictionaries are populated
    if (
      morphTargetDictionaryBodyRef.current &&
      morphTargetDictionaryLowerTeethRef.current
    ) {
      onDictionariesReady(
        morphTargetDictionaryBodyRef.current,
        morphTargetDictionaryLowerTeethRef.current
      );
    }
  }, [
    morphTargetDictionaryBodyRef.current,
    morphTargetDictionaryLowerTeethRef.current,
    onDictionariesReady,
  ]);

  useEffect(() => {
    if (playing === false) return;
    _.each(clips, (clip) => {
      let clipAction = mixer.clipAction(clip);
      clipAction.setLoop(THREE.LoopOnce);
      clipAction.play();
    });
  }, [playing, clips]);

  useFrame((state, delta) => {
    mixer.update(delta);
  });

  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

const STYLES = {
  area: { position: "absolute", bottom: "0", left: "0", zIndex: 500 },
  speak: {
    padding: "5px",
    display: "block",
    color: "#FFFFFF",
    background: "#222222",
    border: "None",
  },
  label: { color: "#777777", fontSize: "0.5em" },
};

function App() {
  const [chats, setChats] = useState([
    { msg: "Hi there! How can I assist you today?", who: "bot", exct: "0" },
  ]);
  const [clips, setClips] = useState([]);
  const [morphTargetDicts, setMorphTargetDicts] = useState({
    body: null,
    lowerTeeth: null,
  });

  const [text, setText] = useState(
    "Hello I am joi, your 3D virtual assistant."
  );
  const [msg, setMsg] = useState("");
  const [exct, setexct] = useState("");
  const [load, setLoad] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [visits, setVisits] = useState("--");
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  const audioPlayer = useRef();
  const [speak, setSpeak] = useState(false);
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const apiCallRetries = useRef({});
  const genAI = useMemo(
    () => new GoogleGenerativeAI(process.env.REACT_APP_BARD_API_KEY),
    []
  );

  const pcmToWav = (pcmData, sampleRate) => {
    const pcm16 = new Int16Array(pcmData);
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, pcm16.length * 2, true);
    for (let i = 0; i < pcm16.length; i++) {
      view.setInt16(44 + i * 2, pcm16[i], true);
    }
    return new Blob([view], { type: "audio/wav" });
  };

  const handleApiCall = useCallback(async (fn, ...args) => {
    const maxRetries = 5;
    const initialDelay = 1000;
    const key = JSON.stringify(fn.name + JSON.stringify(args));
    if (!apiCallRetries.current[key]) {
      apiCallRetries.current[key] = { count: 0, delay: initialDelay };
    }
    try {
      return await fn(...args);
    } catch (error) {
      if (apiCallRetries.current[key].count < maxRetries) {
        apiCallRetries.current[key].count++;
        const currentDelay = apiCallRetries.current[key].delay;
        apiCallRetries.current[key].delay *= 2;
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        return handleApiCall(fn, ...args);
      } else {
        console.error(`Max retries exceeded for API call: ${key}`, error);
        throw error;
      }
    }
  }, []);

  const callTextApi = useCallback(async (prompt) => {
    const chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = process.env.REACT_APP_BARD_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      return result.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response structure from text API.");
    }
  }, []);

  const callTtsApi = useCallback(async (text, voice) => {
    const payload = {
      text: text,
      voice: voice,
    };
    try {
      const response = await axios.post("http://localhost:8002/talk", payload);
      if (response.data && response.data.audioUrl && response.data.blendData) {
        return {
          audioUrl: response.data.audioUrl,
          blendData: response.data.blendData,
        };
      } else {
        throw new Error("Unexpected response structure from backend TTS API.");
      }
    } catch (error) {
      console.error("Error calling backend TTS API:", error);
      throw error;
    }
  }, []);

  const getResposnse = async (userMsg) => {
    if (userMsg === "") {
      toast.error("Prompt can't be empty.");
      return;
    }
    if (load === true || speak === true) {
      toast.error("Already generating response!");
      return;
    }
    setChats((chats) => [...chats, { msg: userMsg, who: "me" }]);
    setMsg("");
    setLoad(true);
    try {
      const start = new Date();
      const prompt = "Generate a short response for this prompt: " + userMsg;
      const responseText = await callTextApi(prompt);
      const { audioUrl, blendData } = await callTtsApi(
        responseText,
        selectedVoice
      );
      const timeTaken = new Date() - start;
      setSpeak(true);
      setText(responseText);
      setAudioSource(audioUrl);
      setexct(timeTaken / 1000);
      setPlaying(true);

      const { body, lowerTeeth } = morphTargetDicts;
      setClips([
        createAnimation(blendData, body, "HG_Body"),
        createAnimation(blendData, lowerTeeth, "HG_TeethLower"),
      ]);

      setChats((chats) => [
        ...chats,
        { msg: responseText, who: "bot", exct: timeTaken / 1000 },
      ]);
    } catch (error) {
      console.error(error);
      setLoad(false);
      toast.error("Failed to generate response. Please try again.");
    }
    setLoad(false);
  };

  useEffect(() => {
    document.querySelector(".chat-box").scrollTop =
      document.querySelector(".chat-box").scrollHeight;
  }, [chats]);

  const startListening = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        setMsg(result);
        getResposnse(result);
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event);
        toast.error(`Speech recognition error: ${event.error}`);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } else {
      toast.error("Voice recognition not supported by this browser.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    setMsg(transcript);
  }, [transcript]);

  function playerEnded(e) {
    setAudioSource(null);
    setSpeak(false);
    setPlaying(false);
  }

  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);
  }

  const handleDictionariesReady = useCallback((bodyDict, lowerTeethDict) => {
    setMorphTargetDicts({
      body: bodyDict,
      lowerTeeth: lowerTeethDict,
    });
  }, []);

  return (
    <div className="full">
      <ToastContainer
        position="top-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <div style={STYLES.area}>
        <button style={STYLES.speak}>
          {speak || load ? "Running..." : "Type message."}
        </button>
      </div>

      <div
        className="about"
        onClick={() => {
          setShowModal(!showModal);
        }}
      >
        <img src="./images/icons/menu.png" alt="menu"></img>
      </div>

      <div className="modal" style={{ display: showModal ? "flex" : "none" }}>
        <h1>Promt 3D</h1>
        <p style={{ marginTop: "10px" }}>
          A ThreeJS-powered virtual human that uses Gemini and TTS APIs to do
          some face talking
        </p>
      </div>

      <div className="chat-div">
        <div className="chat-box">
          {chats.map((chat, index) => {
            if (chat.who === "me") {
              return (
                <p key={index} className={chat.who}>
                  {chat.msg}
                </p>
              );
            } else {
              return (
                <div key={index} className={chat.who}>
                  {chat.msg}
                  <div className="time">{"generated in " + chat.exct + "s"}</div>
                </div>
              );
            }
          })}

          {(load || speak) && !playing ? (
            <p
              style={{ padding: "5px", display: "flex", alignItems: "center" }}
            >
              <lottie-player
                src="https://lottie.host/8891318b-7fd9-471d-a9f4-e1358fd65cd6/EQt3MHyLWk.json"
                style={{ width: "50px", height: "50px" }}
                loop
                autoplay
                speed="1.4"
                direction="1"
                mode="normal"
              ></lottie-player>
            </p>
          ) : (
            <></>
          )}
        </div>

        <div className="msg-box">
          <button
            className="msgbtn"
            id="mic"
            onTouchStart={startListening}
            onMouseDown={startListening}
            onMouseUp={stopListening}
          >
            <img src="./images/icons/mic.png" alt="mic" unselectable="on"></img>
          </button>
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                getResposnse(msg);
              }
            }}
            placeholder="Say Hello!"
          ></input>
          <button
            className="msgbtn"
            id="send"
            onClick={() => {
              getResposnse(msg);
            }}
          >
            <img src="./images/icons/send.png" alt="mic"></img>
          </button>
        </div>
      </div>

      <ReactAudioPlayer
        src={audioSource}
        ref={audioPlayer}
        onEnded={playerEnded}
        onCanPlayThrough={playerReady}
      />

      <Canvas
        dpr={2}
        onCreated={(ctx) => {
          ctx.gl.physicallyCorrectLights = true;
        }}
      >
        <OrthographicCamera makeDefault zoom={1400} position={[0, 1.65, 1]} />
        <Suspense fallback={null}>
          <Environment
            background={false}
            files="/images/photo_studio_loft_hall_1k.hdr"
          />
        </Suspense>
        <Suspense fallback={null}>
          <Bg />
        </Suspense>
        <Suspense fallback={null}>
          <Avatar
            avatar_url="/model.glb"
            speak={speak}
            setSpeak={setSpeak}
            text={text}
            setAudioSource={setAudioSource}
            playing={playing}
            setPlaying={setPlaying}
            callTtsApi={callTtsApi}
            clips={clips}
            onDictionariesReady={handleDictionariesReady}
          />
        </Suspense>
      </Canvas>
      <Loader dataInterpolation={(p) => `Loading... please wait`} />
    </div>
  );
}

function Bg() {
  const texture = useTexture("/images/background.jpg");
  return (
    <mesh position={[0, 1.5, -4]} scale={[1.2, 1.2, 1.2]}>
      <planeBufferGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

export default App;