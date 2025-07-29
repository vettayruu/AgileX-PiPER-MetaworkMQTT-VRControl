import * as React from 'react'
import Head from 'next/head';
import Script from 'next/script';
import 'aframe'

let sora_wait = true;
export default function StereoVideo(props) {
    const {rendered, stereo_visible, setCameraPosition, setCameraRotation, onVideoStream} = props
    const [sora_render, set_sora_render] = React.useState(false)
    const [objectRender, setObjectRender] = React.useState(false)
    //Video Rigister
    React.useEffect(() => {
        if (typeof Sora !== 'undefined' && sora_wait && sora_render && objectRender) {
            // const signalingUrl = 'wss://sora.uclab.jp/signaling'; // for demo
            const signalingUrl = 'wss://sora2.uclab.jp/signaling'; // for uclab development
            const channelId = 'sora_liust1';
            const channelId1 = 'realsense_liust';
            const channelId2 = 'sora-audio_liust';
            const sora = Sora.connection(signalingUrl);
            const bundleId = 'vrdemo-sora-bundle';

            // Webcam
            const channelId3 = 'sora_liust';
            const recvonly3 = sora.recvonly(channelId3, options);

            const remoteVideoWebcam = document.createElement('video');
            remoteVideoWebcam.setAttribute('id', 'remotevideo-webcam');
            remoteVideoWebcam.setAttribute('autoPlay', '');
            remoteVideoWebcam.setAttribute('playsInline', '');
            remoteVideoWebcam.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideoWebcam);

            const options = {
                role: 'recvonly',
                multistream: true,
                video: {
                    codecType: 'VP9',
                    resolution: 'HD',
                    bitrate: 1500
                },
                audio: false,
            };
            const audioSendOptions = {
                role: 'sendonly',
                multistream: true,
                bundleId: bundleId,
                video: false,
                audio: true,
            };
            const audioRecvOptions = {
                role: 'recvonly',
                multistream: true,
                bundleId: bundleId,
                video: false,
                audio: true,
            };

            const recvonly1 = sora.recvonly(channelId1, options);
            const recvonly2 = sora.recvonly(channelId, options);
            const remoteVideo1 = document.getElementById('remotevideo-realsense');
            const remoteVideo = document.getElementById('remotevideo');
            
            sora_wait = false;

            recvonly1.on('track', event => {
                if (event.track.kind === 'video') {
                const mediaStream = new MediaStream();
                mediaStream.addTrack(event.track);
                remoteVideo1.srcObject = mediaStream;
                remoteVideo1.play().then(() => {
                    console.log("play realsense")
                })

                console.log('MediaStream assigned to srcObject:', remoteVideo1.srcObject);

                remoteVideo1.onloadeddata = () => {
                    console.log('Video data loaded');

                    const scene = document.querySelector('a-scene');
                    scene.addEventListener('loaded', () => {
                    console.log('Scene fully loaded');

                    const plate = document.getElementById('videoPlate');
                    plate.setAttribute('material', {src: '#remotevideo-realsense'});

                    
                    });
                };
                }
            });
            recvonly1.connect().then(() => {
                console.log('Successfully connected to Sora');
            }).catch(err => {
                console.error('Sora connection error:', err);
            });
            
            recvonly2.on('track', event => {
                console.log('Video start');
                if (event.track.kind === 'video') {
                    const mediaStream = new MediaStream();
                    mediaStream.addTrack(event.track);
                    remoteVideo.srcObject = mediaStream;
                    console.log(remoteVideo)
                    remoteVideo.play().then(() => {
                        const playButton = document.querySelector('#videoPlayButton');
                        playButton.setAttribute('visible', 'false')
                    })
                    
                    console.log('MediaStream assigned to srcObject:', remoteVideo.srcObject);
                    
                    remoteVideo.onloadeddata = () => {
                        console.log('Video data loaded');
                        
                        const scene = document.querySelector('a-scene');
                        scene.addEventListener('loaded', () => {
                            console.log('Scene fully loaded');
                            
                            const leftSphere = document.getElementById('leftSphere');
                            const rightSphere = document.getElementById('rightSphere');
                            
                            if (leftSphere && rightSphere) {
                                leftSphere.setAttribute('material', {src: '#remotevideo'});
                                rightSphere.setAttribute('material', {src: '#remotevideo'});
                                
                                console.log('Left sphere material component:', leftSphere.components.material);
                                console.log('Right sphere material component:', rightSphere.components.material);
                            } else {
                                console.error('Left or right sphere not found in the DOM');
                            }
                            
                        });
                    };
                }
            });
            recvonly2.connect().then(() => {
                console.log('Successfully connected to Sora for channel 2');
            }).catch(err => {
                console.error('Sora connection error for channel 2:', err);
            });

            recvonly3.on('track', event => {
                if (event.track.kind === 'video') {
                    const mediaStream = new MediaStream();
                    mediaStream.addTrack(event.track);
                    remoteVideoWebcam.srcObject = mediaStream;
                    remoteVideoWebcam.play().then(() => {
                        console.log("play webcam");
                    });
                    console.log('MediaStream assigned to srcObject:', remoteVideoWebcam.srcObject);
                }
            });
            recvonly3.connect().then(() => {
                console.log('Successfully connected to Sora for webcam channel');
            }).catch(err => {
                console.error('Sora connection error for webcam channel:', err);
            });

            const audioOptions = {
                role: 'sendrecv',
                multistream: true,
                //bundleId: bundleId,
                video: false,
                audio: true,
                enabledMetadata: true
                };

            let localStream

            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(stream => {
                    
                    localStream = stream;
                    const audioTracks = stream.getAudioTracks();
                    console.log('Local audio tracks:', audioTracks);
                    audioTracks.forEach(track => {
                        console.log('Audio track settings:', track.getSettings());
                        console.log('Audio track enabled:', track.enabled);
                        console.log('Audio track muted:', track.muted);
                    });
                    const audioSendRecv = sora.sendrecv(channelId2, null, audioOptions);

                    audioSendRecv.on('log', (msg) => {
                        console.log('Sora log:', msg);
                      });
                    
                      // Peerイベントの監視
                      audioSendRecv.on('peerLeave', (peerId) => {
                        console.log('Peer left:', peerId);
                      });
                    
                      audioSendRecv.on('peerJoin', (peerId) => {
                        console.log('Peer joined:', peerId);
                      });

                audioSendRecv.on('track', event => {
                    console.log('Track event received:', event);
                    console.log('Track type:', event.track.kind);
                    console.log('Track ID:', event.track.id);
                    console.log('Track enabled:', event.track.enabled);
                    console.log('Track readyState:', event.track.readyState);
                if (event.track.kind === 'audio') {

                    console.log('Audio track enabled:', event.track.enabled);
                    console.log('Audio track readyState:', event.track.readyState);

                    const audioStream = new MediaStream();
                    audioStream.addTrack(event.track);

                    const audioElement = document.createElement('audio');
                    audioElement.srcObject = audioStream;
                    audioElement.autoplay = true;
                    audioElement.style.display = "none"; // 表示を非表示に
                    document.body.appendChild(audioElement); // AudioエレメントをDOMに追加

                    // Audioの再生
                    audioElement.play().then(() => { 
                    console.log('Audio started playing');
                    }).catch(error => {
                    console.error('Error playing audio:', error);
                    });
                }
                });

                audioSendRecv.on('notify', message => {
                    console.log('Notify received:', message);
                  });

                return audioSendRecv.connect(localStream).then(() => {
                console.log('Successfully connected to Sora for audio send channel');
                }).catch(err => {
                console.error('Sora connection error for audio send channel:', err);
                });

            })
                .catch(error => {
                console.error('Error accessing media devices:', error);
                });

        }

    }, [sora_render, objectRender]);

    //ビデオ，オブジェクトの追加
    React.useEffect(() => {
        const scene = document.querySelector('a-scene');
        const UIBack = document.querySelector('#UIBack');
        if (scene && rendered) {
            //assetの追加
            const assets = document.createElement('a-assets');
            
            const remoteVideo = document.createElement('video');
            remoteVideo.setAttribute('id', 'remotevideo');
            remoteVideo.setAttribute('autoPlay', '');
            remoteVideo.setAttribute('playsInline', '');
            remoteVideo.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideo);
            
            const remoteVideoRealSense = document.createElement('video');
            remoteVideoRealSense.setAttribute('id', 'remotevideo-realsense');
            remoteVideoRealSense.setAttribute('autoPlay', '');
            remoteVideoRealSense.setAttribute('playsInline', '');
            remoteVideoRealSense.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideoRealSense);
            
            scene.appendChild(assets);
            
            //objectの追加
            const leftSphere = document.createElement('a-entity');
            leftSphere.setAttribute('id', 'leftSphere');
            leftSphere.setAttribute('scale', '-1 1 1');
            leftSphere.setAttribute('position', '0 1.7 0');
            leftSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            leftSphere.setAttribute('material', 'shader:flat; src:#remotevideo; side:back');
            leftSphere.setAttribute('stereo', 'eye:left; mode: half;');

            const rightSphere = document.createElement('a-entity');
            rightSphere.setAttribute('id', 'rightSphere');
            rightSphere.setAttribute('scale', '-1 1 1');
            rightSphere.setAttribute('position', '0 1.7 0');
            rightSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            rightSphere.setAttribute('material', 'shader:flat; src:#remotevideo; side:back');
            rightSphere.setAttribute('stereo', 'eye:right; mode: half;');
            rightSphere.setAttribute('visible', true);
            
            const videoPlane = document.createElement('a-plane');
            videoPlane.setAttribute('id', 'videoPlate');
            videoPlane.setAttribute('position', '-0.1 -0.1 -0.33');
            videoPlane.setAttribute('scale', '0.08 0.08 1');
            videoPlane.setAttribute('width', '1.6');
            videoPlane.setAttribute('height', '0.9');
            videoPlane.setAttribute('material', 'src: #remotevideo-realsense;');
            videoPlane.setAttribute('current-ui', '');
            videoPlane.setAttribute('visible', true); //ワイプの手先カメラ表示
            
            const playButton = document.createElement('a-plane');
            playButton.setAttribute('id', 'videoPlayButton');
            playButton.setAttribute('position', '0 0.3 -2');
            playButton.setAttribute('width', '1.1');
            playButton.setAttribute('height', '0.3');
            playButton.setAttribute('color', 'blue');
            playButton.setAttribute('class', 'clickable')
            playButton.setAttribute('video-play', '');

            const playButtonText = document.createElement('a-text');
            playButtonText.setAttribute('value', 'Play Video');
            playButtonText.setAttribute('align', 'center');
            playButton.appendChild(playButtonText);

            const backStereo = document.createElement('a-plane');
            backStereo.setAttribute('id', 'backStereoUI');
            backStereo.setAttribute('position', '0 0.35 -3');
            backStereo.setAttribute('width', '2.8');
            backStereo.setAttribute('height', '0.3');
            backStereo.setAttribute('color', 'red');

            
            const backStereoText = document.createElement('a-text');
            backStereoText.setAttribute('position', '0 0 0.01');
            backStereoText.setAttribute('value', 'Press (A) to see real space');
            backStereoText.setAttribute('align', 'center');
            backStereo.appendChild(backStereoText);
            
                        
            // 新しい <a-entity> を <a-scene> に追加
            scene.appendChild(leftSphere);
            scene.appendChild(rightSphere);
            UIBack.appendChild(videoPlane);
            scene.appendChild(playButton)
            scene.appendChild(backStereo)
            
            setObjectRender(true)
            
            console.log("add video object")
        }    
    }, [rendered])

    React.useEffect(() => {
        const leftSphere = document.querySelector('#leftSphere');
        const rightSphere = document.querySelector('#rightSphere');
        const backStereoUI = document.querySelector('#backStereoUI');
        
        leftSphere.setAttribute('visible',`${stereo_visible}`)
        rightSphere.setAttribute('visible',`${stereo_visible}`)
        backStereoUI.setAttribute('visible',`${!stereo_visible}`)

    },[stereo_visible])


    React.useEffect(() => {
        const intervalId = setInterval(() => {
        const entity = document.getElementById('UIBack'); // idでエンティティを取得
        if (entity) {
            const position = entity.getAttribute('position'); // 位置を取得
            const rotation = entity.getAttribute('rotation'); // 位置を取得
            setCameraPosition({x:position.x, y:position.y, z:position.z})
            setCameraRotation({x:rotation.x, y:rotation.y, z:rotation.z})
        }
        }, 10); // 100msごとに位置を更新

        return () => clearInterval(intervalId); // クリーンアップ
    }, []);
            
    return (
        <>
            <Head>
                <script
                    src='https://aframe.io/releases/1.4.2/aframe.min.js'
                    strategy='lazyOnload'
                    ></script>
                <script
                    src='https://unpkg.com/mqtt/dist/mqtt.min.js'
                    strategy='lazyOnload'
                    ></script>
                <script src='../../node_modules/aframe-extras/dist/aframe-extras.min.js'></script>
            </Head>

            <Script
            src="https://cdn.jsdelivr.net/npm/sora-js-sdk@2021.1.1/dist/sora.min.js"
            strategy="lazyOnload"
            onLoad={() => {
                console.log('Sora SDK loaded successfully.');
                set_sora_render(true)
            }}
            onError={(e) => {
                console.error('Failed to load Sora SDK:', e);
            }}
            />
        </>
    )
}

if(!('stereo' in AFRAME.components)){
    // Define the stereo component and stereocam component
    const stereoComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
            mode: { type: 'string', default: 'full' },
            split: { type: 'string', default: 'horizontal' },
            playOnClick: { type: 'boolean', default: true },
        },
        init() {
            this.video_click_event_added = false;
            this.material_is_a_video = true;
            
            if (this.el.getAttribute('material') !== null && 'src' in this.el.getAttribute('material') && this.el.getAttribute('material').src !== '') {
                const src = this.el.getAttribute('material').src;
                
                if (typeof src === 'object' && ('tagName' in src && src.tagName === 'VIDEO')) {
                    this.material_is_a_video = true;
                }
            }
            
            const object3D = this.el.object3D.children[0];
            const validGeometries = [THREE.SphereGeometry, THREE.SphereBufferGeometry, THREE.BufferGeometry];
            const isValidGeometry = validGeometries.some(geometry => object3D.geometry instanceof geometry);
            
            if (isValidGeometry && this.material_is_a_video) {
                let geometry;
                const geo_def = this.el.getAttribute('geometry');
                if (this.data.mode === 'half') {
                    //geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64, Math.PI / 3, 4 * Math.PI / 3, 0.2, Math.PI-0.4);
                    geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64, 19 * Math.PI / 36, 17 * Math.PI / 18, 0, Math.PI);
                } else {
                    geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64);
                }
                object3D.rotation.y = Math.PI / 2;
                //object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1); //20?
                //const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                //const offset = this.data.eye === 'left' ? (axis === 'y' ? { x: 0.05, y: 0 } : { x: 0, y: 0.5 }) : (axis === 'y' ? { x: 0.55, y: 0 } : { x: 0, y: 0 });
                //const repeat = axis === 'y' ? { x: 0.4, y: 1 } : { x: 1, y: 0.5 };
                object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1);
                object3D.position.y = 1.7;
                const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                const offset = this.data.eye === 'right' ? (axis === 'y' ? { x: 0, y: 0 } : { x: 0, y: 0.5 }) : (axis === 'y' ? { x: 0.5, y: 0 } : { x: 0, y: 0 });
                const repeat = axis === 'y' ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 };
                const uvAttribute = geometry.attributes.uv;
                for (let i = 0; i < uvAttribute.count; i++) {
                    const u = uvAttribute.getX(i) * repeat.x + offset.x;
                    const v = uvAttribute.getY(i) * repeat.y + offset.y;
                    uvAttribute.setXY(i, u, v);
                }
                uvAttribute.needsUpdate = true;
                object3D.geometry = geometry;
                this.videoEl = document.getElementById('remotevideo');
                this.el.setAttribute('material', { src: this.videoEl });
                this.videoEl.play();
            } else {
                this.video_click_event_added = true;
            }
        },
        update(oldData) {
            const object3D = this.el.object3D.children[0];
            const data = this.data;
            if (data.eye === 'both') {
                object3D.layers.set(0);
            } else {
                object3D.layers.set(data.eye === 'left' ? 1 : 2);
            }
        },
    };
    
    const stereocamComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
        },
        init() {
            this.layer_changed = false;
        },
        tick() {
            const originalData = this.data;
            if (!this.layer_changed) {
                const childrenTypes = this.el.object3D.children.map(item => item.type);
                const rootIndex = childrenTypes.indexOf('PerspectiveCamera');
                const rootCam = this.el.object3D.children[rootIndex];
                if (originalData.eye === 'both') {
                    rootCam.layers.enable(1);
                    rootCam.layers.enable(2);
                } else {
                    rootCam.layers.enable(originalData.eye === 'left' ? 1 : 2);
                }
            }
        },
    };
    
    if(!('stereo' in AFRAME.components)){
        AFRAME.registerComponent('stereo', stereoComponent);
    }
    if(!('stereocam' in AFRAME.components)){
        AFRAME.registerComponent('stereocam', stereocamComponent);
    }
}

if(!('video-play' in AFRAME.components)){
    AFRAME.registerComponent('video-play',{
        init() {
            const el = this.el
            el.addEventListener('raycaster-intersected', function () {
                el.setAttribute('color', '#4c6cb3');
            });
            el.addEventListener('raycaster-intersected-cleared', function () {
                el.setAttribute('color', 'blue');
            });
            el.addEventListener('click', function () {
                console.log("click")
                if(el.getAttribute("visible")){
                    const stereoVideo = document.getElementById('remotevideo');
                    stereoVideo.play();
                    const tipVideo = document.getElementById('remotevideo-realsense');
                    tipVideo.play();
                    el.setAttribute('visible', false)
                }
            })
        }}
    )
}