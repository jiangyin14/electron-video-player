'use client'

import { useState, useEffect, useRef } from 'react'

// 视频接口定义
interface Video {
  id: string
  name: string
  path: string
  thumbnail?: string
  duration?: string
  addedAt: string
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  // 重启网站后不保留之前的视频，注释掉localStorage加载逻辑
  // useEffect(() => {
  //   const storedVideos = localStorage.getItem('videos')
  //   if (storedVideos) {
  //     setVideos(JSON.parse(storedVideos))
  //   }
  // }, [])

  // 加载主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // 切换主题
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // 保存视频到localStorage
  const saveVideos = (videoList: Video[]) => {
    localStorage.setItem('videos', JSON.stringify(videoList))
    setVideos(videoList)
  }

  // 生成视频缩略图
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.crossOrigin = 'anonymous'
      video.currentTime = 1 // 获取第1秒的帧

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        video.currentTime = 1
      }

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
          resolve(thumbnail)
        }
      }

      video.onerror = () => {
        resolve('/placeholder-video.jpg') // 备用图片
      }

      video.src = URL.createObjectURL(file)
    })
  }

  // 获取视频时长
  const getVideoDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      
      video.onloadedmetadata = () => {
        const duration = video.duration
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }

      video.onerror = () => {
        resolve('未知')
      }

      video.src = URL.createObjectURL(file)
    })
  }

  // 处理文件添加
  const handleFileAdd = async (files: FileList) => {
    const newVideos: Video[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // 检查文件类型
      if (!file.type.startsWith('video/')) {
        alert(`文件 ${file.name} 不是视频文件`)
        continue
      }

      // 已移除视频数量限制，可以添加任意数量的视频

      // 创建临时URL用于视频路径
      const videoPath = URL.createObjectURL(file)
      
      try {
        const thumbnail = await generateThumbnail(file)
        const duration = await getVideoDuration(file)

        const newVideo: Video = {
          id: `video_${Date.now()}_${i}`,
          name: file.name,
          path: videoPath,
          thumbnail,
          duration,
          addedAt: new Date().toISOString()
        }

        newVideos.push(newVideo)
      } catch (error) {
        console.error('处理视频失败:', error)
      }
    }

    if (newVideos.length > 0) {
      const updatedVideos = [...videos, ...newVideos]
      saveVideos(updatedVideos)
    }
  }

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileAdd(files)
    }
  }

  // 文件选择处理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileAdd(files)
    }
  }

  // 删除视频（无需确认，直接删除）
  const handleDeleteVideo = (videoId: string) => {
    const updatedVideos = videos.filter(video => video.id !== videoId)
    saveVideos(updatedVideos)
  }

  // 打开视频播放器弹窗
  const openPlayer = (video: Video) => {
    setCurrentVideo(video)
    setIsPlayerOpen(true)
  }

  // 关闭播放器弹窗
  const closePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
    setIsPlayerOpen(false)
    setCurrentVideo(null)
  }

  // 初始化ArtPlayer
  useEffect(() => {
    if (!isPlayerOpen || !currentVideo || !playerContainerRef.current) return

    const initPlayer = async () => {
      try {
        const Artplayer = (await import('artplayer')).default
        
        if (playerRef.current) {
          playerRef.current.destroy()
        }

        playerRef.current = new Artplayer({
          container: playerContainerRef.current!,
          url: currentVideo.path,
          poster: currentVideo.thumbnail,
          volume: 0.7,
          isLive: false,
          muted: false,
          autoplay: true,
          pip: true,
          autoSize: true,
          autoMini: true,
          screenshot: true,
          setting: true,
          loop: false,
          flip: true,
          playbackRate: true,
          aspectRatio: true,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: false,
          miniProgressBar: true,
          mutex: true,
          backdrop: true,
          playsInline: true,
          autoPlayback: true,
          airplay: true,
          theme: '#23ade5',
          lang: 'zh-cn',
          controls: [
            {
              position: 'right',
              html: '画中画',
              tooltip: '开启画中画模式',
              click: function () {
                if (document.pictureInPictureElement) {
                  document.exitPictureInPicture()
                } else {
                  playerRef.current.video.requestPictureInPicture()
                }
              }
            }
          ],
          contextmenu: [
            {
              html: '视频信息',
              click: function () {
                alert(`
视频名称：${currentVideo.name}
视频时长：${currentVideo.duration || '未知'}
添加时间：${new Date(currentVideo.addedAt).toLocaleString()}
                `)
              }
            }
          ]
        })

        // 播放器事件监听
        playerRef.current.on('ready', () => {
          console.log('播放器准备就绪')
        })

        playerRef.current.on('error', (error: any) => {
          console.error('播放器错误:', error)
          alert('视频播放失败，请检查视频文件是否完整')
        })

      } catch (err) {
        console.error('初始化播放器失败:', err)
        alert('播放器初始化失败')
      }
    }

    initPlayer()

    // 清理函数
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [isPlayerOpen, currentVideo])

  // 处理ESC键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayerOpen) {
        closePlayer()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlayerOpen])

  return (
    <div>
      <main style={{ padding: '20px' }}>
        {/* 视频网格 */}
        <div className="video-grid">
          {/* 现有视频卡片 */}
          {videos.map((video) => (
              <div key={video.id} className="video-card">
                <div 
                  className="video-thumbnail"
                  onClick={() => openPlayer(video)}
                  style={{ cursor: 'pointer' }}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div>🎬 视频缩略图</div>
                  )}
                  {/* 播放按钮覆盖层 */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  className="play-overlay">
                    ▶️
                  </div>
                </div>
                
                <div className="video-info">
                  <div className="video-title" title={video.name}>
                    {video.name}
                  </div>
                  <div className="video-meta">
                    时长: {video.duration || '未知'} | 
                    添加时间: {new Date(video.addedAt).toLocaleDateString()}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openPlayer(video)}
                      className="btn btn-primary"
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      播放
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          
          {/* 添加视频卡片 */}
          <div className="video-card upload-card">
              <div
                className={`video-thumbnail upload-thumbnail ${isDragOver ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #ddd',
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  点击添加视频
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
                  或拖拽到此处
                </div>
              </div>
              
              <div className="video-info">
                <div className="video-title">
                  添加新视频
                </div>
                <div className="video-meta">
                  支持 MP4, MOV, AVI 等格式，支持拖拽上传，数量不宜超过20个。
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {videos.length} 个视频
                  </div>
                </div>
              </div>
            </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
        
        {/* 空状态提示 */}
        {videos.length === 0 && (
          <div className="empty-state" style={{ marginTop: '40px' }}>
            <h2>还没有添加视频</h2>
            <p>点击上方添加卡片开始上传您的第一个视频</p>
          </div>
        )}
      </main>

      {/* 视频播放器弹窗 */}
      {isPlayerOpen && currentVideo && (
        <div className="player-modal-overlay" onClick={closePlayer}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            {/* 关闭按钮 */}
            <button 
              className="player-close-btn"
              onClick={closePlayer}
              title="关闭播放器 (ESC)"
            >
              ✕
            </button>
            
            {/* 视频标题 */}
            <div className="player-header">
              <h3>{currentVideo.name}</h3>
              <div className="player-meta">
                时长: {currentVideo.duration || '未知'} | 
                添加时间: {new Date(currentVideo.addedAt).toLocaleString()}
              </div>
            </div>
            
            {/* 播放器容器 */}
            <div 
              ref={playerContainerRef}
              className="player-container-modal"
            />
          </div>
        </div>
      )}

      {/* 主题切换按钮 */}
      <button
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDarkMode ? '🌞' : '🌙'}
      </button>
    </div>
  )
} 