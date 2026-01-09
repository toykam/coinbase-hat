'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  Download,
  RotateCcw,
  LoaderCircle,
  Wand2,
  Scale,
  Rotate3d,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { getHatSuggestions } from '@/app/actions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Stage = 'upload' | 'edit' | 'loading';
type HatState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

const hatImagePlaceholder = PlaceHolderImages.find(img => img.id === 'coinbase-hat');
const HAT_URL = hatImagePlaceholder?.imageUrl || '';
const HAT_ASPECT_RATIO = 400 / 350; // Approximate aspect ratio of the blue hat png

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export default function HatStudio() {
  const [stage, setStage] = useState<Stage>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hatState, setHatState] = useState<HatState>({ x: 50, y: 10, scale: 0.3, rotation: 0 });
  const [suggestedSizes, setSuggestedSizes] = useState<string[] | null>(null);
  const { toast } = useToast();

  const editorRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setStage('upload');
    setUploadedImage(null);
    setImageDimensions(null);
    setHatState({ x: 50, y: 10, scale: 0.3, rotation: 0 });
    setSuggestedSizes(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file format',
        description: 'Please upload a JPEG, PNG, or WEBP image.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB.',
      });
      return;
    }

    setStage('loading');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = document.createElement('img');
      img.onload = async () => {
        setImageDimensions({ width: img.width, height: img.height });
        setUploadedImage(e.target?.result as string);
        
        // Mock face detection for AI suggestion
        const faceWidth = img.width / 3;
        const faceHeight = img.height / 2;

        try {
          const suggestions = await getHatSuggestions({ faceWidth, faceHeight });
          setSuggestedSizes(suggestions);
        } catch (error) {
          console.error("Failed to get AI suggestions", error);
          setSuggestedSizes(['small', 'medium', 'large']);
        }
        
        setHatState(prev => ({ ...prev, x: (img.width / 2) - (img.width * prev.scale * HAT_ASPECT_RATIO / 2), y: img.height * 0.1 }));
        setStage('edit');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [toast]);
  
  const handleDownload = useCallback(() => {
    if (!uploadedImage || !imageDimensions || !editorRef.current) {
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        toast({ variant: 'destructive', title: 'Could not process image' });
        return;
    }

    const baseImage = new window.Image();
    baseImage.onload = () => {
        ctx.drawImage(baseImage, 0, 0);

        const hatImage = new window.Image();
        hatImage.crossOrigin = 'anonymous';
        hatImage.onload = () => {
            const hatWidth = imageDimensions.width * hatState.scale;
            const hatHeight = hatWidth / HAT_ASPECT_RATIO;
            const hatCenterX = hatState.x + hatWidth / 2;
            const hatCenterY = hatState.y + hatHeight / 2;
            
            ctx.save();
            ctx.translate(hatCenterX, hatCenterY);
            ctx.rotate(hatState.rotation * (Math.PI / 180));
            ctx.translate(-hatCenterX, -hatCenterY);
            ctx.drawImage(hatImage, hatState.x, hatState.y, hatWidth, hatHeight);
            ctx.restore();

            const link = document.createElement('a');
            link.download = 'hat-studio.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        hatImage.src = HAT_URL;
    };
    baseImage.src = uploadedImage;
}, [uploadedImage, imageDimensions, hatState, toast]);


  const renderContent = () => {
    switch (stage) {
      case 'loading':
        return <LoadingState />;
      case 'edit':
        return (
          <Editor
            uploadedImage={uploadedImage!}
            hatState={hatState}
            setHatState={setHatState}
            onDownload={handleDownload}
            onReset={resetState}
            suggestedSizes={suggestedSizes}
            imageDimensions={imageDimensions!}
            editorRef={editorRef}
          />
        );
      case 'upload':
      default:
        return <ImageUploader onFileSelect={handleFile} />;
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground">Coinbase Hat Studio</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
        Upload a photo, place a hat on your head, and download your new look. It's that simple!
      </p>
      <div className="w-full mt-8">{renderContent()}</div>
    </div>
  );
}

const ImageUploader = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <Card
      onClick={handleClick}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`w-full max-w-2xl mx-auto border-2 border-dashed transition-all duration-300 cursor-pointer hover:border-primary/80 ${
        isDragging ? 'border-primary shadow-lg' : 'border-border'
      }`}
    >
      <CardContent className="p-8 md:p-16 flex flex-col items-center justify-center">
        <UploadCloud className="w-16 h-16 text-muted-foreground" />
        <p className="mt-4 font-semibold text-foreground">
          Drag & drop your photo here
        </p>
        <p className="text-muted-foreground text-sm">or click to select a file</p>
        <p className="text-muted-foreground text-xs mt-2">(JPEG, PNG, WEBP up to 10MB)</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={SUPPORTED_FORMATS.join(',')}
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-16">
    <LoaderCircle className="w-16 h-16 text-primary animate-spin" />
    <p className="mt-4 text-lg text-muted-foreground">Processing your image...</p>
  </div>
);

const Editor = ({
  uploadedImage,
  hatState,
  setHatState,
  onDownload,
  onReset,
  suggestedSizes,
  imageDimensions,
  editorRef
}: {
  uploadedImage: string;
  hatState: HatState;
  setHatState: React.Dispatch<React.SetStateAction<HatState>>;
  onDownload: () => void;
  onReset: () => void;
  suggestedSizes: string[] | null;
  imageDimensions: { width: number; height: number };
  editorRef: React.RefObject<HTMLDivElement>;
}) => {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, hatX: 0, hatY: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      hatX: hatState.x,
      hatY: hatState.y,
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !editorRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setHatState(prev => ({
      ...prev,
      x: dragStartRef.current.hatX + dx,
      y: dragStartRef.current.hatY + dy,
    }));
  };
  
  const handleMouseUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-3xl overflow-hidden shadow-lg">
          <CardContent className="p-0 relative" ref={editorRef} style={{ aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`}}>
            <Image src={uploadedImage} alt="Uploaded" layout="fill" objectFit="contain" />
            <div
              onMouseDown={handleMouseDown}
              className="absolute cursor-move"
              style={{
                left: hatState.x,
                top: hatState.y,
                width: `${imageDimensions.width * hatState.scale}px`,
                transform: `rotate(${hatState.rotation}deg)`,
                transformOrigin: 'center',
              }}
            >
              <Image src={HAT_URL} alt="Hat" layout="responsive" width={400} height={350} />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="w-full lg:w-80 flex-shrink-0 shadow-lg">
        <CardContent className="p-6 flex flex-col gap-6 text-left">
          {suggestedSizes && (
            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="font-semibold">AI Suggestions</AlertTitle>
              <AlertDescription>
                Recommended sizes: {suggestedSizes.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Scale className="h-4 w-4 text-muted-foreground" /> Size
            </label>
            <Slider
              value={[hatState.scale]}
              onValueChange={([val]) => setHatState(prev => ({ ...prev, scale: val }))}
              min={0.05}
              max={1}
              step={0.01}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Rotate3d className="h-4 w-4 text-muted-foreground" /> Rotation
            </label>
            <Slider
              value={[hatState.rotation]}
              onValueChange={([val]) => setHatState(prev => ({ ...prev, rotation: val }))}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={onDownload} size="lg" className="rounded-lg py-6 text-base">
              <Download className="mr-2 h-5 w-5" /> Download
            </Button>
            <Button onClick={onReset} variant="outline" className="rounded-lg">
              <RotateCcw className="mr-2 h-4 w-4" /> Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
