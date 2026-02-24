import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/AddItem.css';
import { loadItemForEdit, loadTags, updateItem, TagDto, API_BASE } from '../lib/api';

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function EditItem() {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tags, setTags] = useState<TagDto[]>([]);

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [latitude, setLatitude] = useState<number>(35.7036);
  const [longitude, setLongitude] = useState<number>(51.3517);
  const [tagIds, setTagIds] = useState<number[]>([]);

  // optional: show current images (no editing yet)
  const [images, setImages] = useState<Array<{ imid: number; image_url: string }>>([]);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Invalid item id');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([loadItemForEdit(id), loadTags()])
      .then(([item, tagsRes]) => {
        setTags(tagsRes || []);

        setTitle(item.title ?? '');
        setDescription(item.description ?? '');
        setType((item.type ?? 'lost').toLowerCase() === 'found' ? 'found' : 'lost');
        setLatitude(Number(item.latitude));
        setLongitude(Number(item.longitude));

        // backend returns item_tags with full tags in GET /items/:id
        const existingTagIds: number[] =
          Array.isArray(item.tags) ? item.tags.map((t: any) => Number(t.tid)).filter(Number.isFinite) : [];
        setTagIds(existingTagIds);

        setImages(Array.isArray(item.images) ? item.images : []);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load item'))
      .finally(() => setLoading(false));
  }, [id]);

  const tagById = useMemo(() => {
    const m: Record<number, TagDto> = {};
    tags.forEach((t) => (m[t.tid] = t));
    return m;
  }, [tags]);

  const toggleTag = (tid: number) => {
    setTagIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError('Title is required');
    if (!description.trim()) return setError('Description is required');
    if (!tagIds.length) return setError('Select at least one tag');

    setSaving(true);
    try {
      await updateItem(id, {
        title: title.trim(),
        description: description.trim(),
        type,
        latitude,
        longitude,
        tagIds,
      });

      navigate(`/items/${id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className='message'>Loading…</div>;

  return (
    <div className='add-item-root'>
      <form className='add-item-form' onSubmit={onSubmit}>
        <h2 className='form-title'>Edit Item</h2>

        {error && <div className='message'>{error}</div>}

        <label className='label'>Title</label>
        <input className='input' value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className='label'>Description</label>
        <textarea className='textarea' value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className='label'>Type</label>
        <div className='type-options'>
          <label className={'type-label ' + (type === 'lost' ? 'type-selected' : '')}>
            <input type='radio' checked={type === 'lost'} onChange={() => setType('lost')} />
            <span className='type-text'>LOST</span>
          </label>
          <label className={'type-label ' + (type === 'found' ? 'type-selected' : '')}>
            <input type='radio' checked={type === 'found'} onChange={() => setType('found')} />
            <span className='type-text'>FOUND</span>
          </label>
        </div>

        <div className='row'>
          <div className='col'>
            <label className='label'>Latitude</label>
            <input
              className='input'
              type='number'
              step='0.000001'
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value))}
            />
          </div>
          <div className='col'>
            <label className='label'>Longitude</label>
            <input
              className='input'
              type='number'
              step='0.000001'
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value))}
            />
          </div>
        </div>

        <label className='label'>Tags</label>
        <div className='tags'>
          {tags.map((t) => (
            <button
              key={t.tid}
              type='button'
              className={'tag-btn ' + (tagIds.includes(t.tid) ? 'tag-selected' : '')}
              onClick={() => toggleTag(t.tid)}
              title={t.tagname}
            >
              {t.tagname}
            </button>
          ))}
        </div>

        {/* optional: show existing images */}
        {images.length > 0 ? (
          <>
            <label className='label'>Current images</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map((im) => {
                const src = toAbsoluteUrl(im.image_url);
                return src ? (
                  <img key={im.imid} src={src} alt='item' style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 10 }} />
                ) : null;
              })}
            </div>
          </>
        ) : null}

        <div className='actions'>
          <button type='button' className='submit-btn' onClick={() => navigate(`/items/${id}`)} disabled={saving}>
            Cancel
          </button>

          <button type='submit' className='submit-btn' disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* small debug helper */}
        {!tagIds.length ? (
          <div className='message'>
            Tip: your backend requires <b>at least one tag</b> when editing.
          </div>
        ) : null}
      </form>
    </div>
  );
}