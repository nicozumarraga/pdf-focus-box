import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface BoundingBox {
  id: string;
  coords: [number, number, number, number];
  label?: string;
}

interface BoundingBoxFormProps {
  boundingBoxes: BoundingBox[];
  onAddBoundingBox: (bbox: BoundingBox) => void;
  onRemoveBoundingBox: (id: string) => void;
  activeBoundingBox: string | null;
  onSetActiveBoundingBox: (id: string) => void;
}

export const BoundingBoxForm = ({
  boundingBoxes,
  onAddBoundingBox,
  onRemoveBoundingBox,
  activeBoundingBox,
  onSetActiveBoundingBox,
}: BoundingBoxFormProps) => {
  const [x1, setX1] = useState('');
  const [y1, setY1] = useState('');
  const [x2, setX2] = useState('');
  const [y2, setY2] = useState('');
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const coords = [
      parseInt(x1),
      parseInt(y1),
      parseInt(x2),
      parseInt(y2),
    ] as [number, number, number, number];

    if (coords.some(isNaN)) {
      toast.error('Please enter valid coordinates');
      return;
    }

    if (coords[0] >= coords[2] || coords[1] >= coords[3]) {
      toast.error('Invalid bounding box: x2 must be > x1 and y2 must be > y1');
      return;
    }

    const newBbox: BoundingBox = {
      id: Date.now().toString(),
      coords,
      label: label.trim() || undefined,
    };

    onAddBoundingBox(newBbox);
    
    // Clear form
    setX1('');
    setY1('');
    setX2('');
    setY2('');
    setLabel('');
    
    toast.success('Bounding box added successfully');
  };

  const loadExampleBox = () => {
    setX1('464');
    setY1('54');
    setX2('496');
    setY2('197');
    setLabel('Example Box');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Bounding Box</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="x1">X1</Label>
                <Input
                  id="x1"
                  type="number"
                  value={x1}
                  onChange={(e) => setX1(e.target.value)}
                  placeholder="464"
                />
              </div>
              <div>
                <Label htmlFor="y1">Y1</Label>
                <Input
                  id="y1"
                  type="number"
                  value={y1}
                  onChange={(e) => setY1(e.target.value)}
                  placeholder="54"
                />
              </div>
              <div>
                <Label htmlFor="x2">X2</Label>
                <Input
                  id="x2"
                  type="number"
                  value={x2}
                  onChange={(e) => setX2(e.target.value)}
                  placeholder="496"
                />
              </div>
              <div>
                <Label htmlFor="y2">Y2</Label>
                <Input
                  id="y2"
                  type="number"
                  value={y2}
                  onChange={(e) => setY2(e.target.value)}
                  placeholder="197"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Description"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Box
              </Button>
              <Button type="button" variant="outline" onClick={loadExampleBox}>
                Example
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {boundingBoxes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bounding Boxes ({boundingBoxes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {boundingBoxes.map((bbox) => (
                <div
                  key={bbox.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    activeBoundingBox === bbox.id
                      ? 'border-annotation bg-annotation/10'
                      : 'border-border hover:border-primary'
                  }`}
                  onClick={() => onSetActiveBoundingBox(bbox.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {bbox.label || `Box ${bbox.id}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        [{bbox.coords.join(', ')}]
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBoundingBox(bbox.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};