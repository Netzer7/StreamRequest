import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoPlay from 'embla-carousel-autoplay'
import { Star, Loader2 } from 'lucide-react'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w400';

const TrendingCarousel = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const autoplayOptions = AutoPlay({ 
    delay: 2000,
    stopOnInteraction: false,
    stopOnMouseEnter: false,
    rootNode: (emblaRoot) => emblaRoot.parentElement,
  })

  const [emblaRef] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    slidesToScroll: 1,
    speed: 5, 
    dragFree: true, 
    containScroll: false 
  }, [
    AutoPlay({ 
      delay: 3000, 
      stopOnInteraction: false, 
      stopOnMouseEnter: true, 
      playOnInit: true 
    })
  ]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/trending/all/week?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );

        if (!response.ok) throw new Error('Failed to fetch trending media');
        const data = await response.json();
        
        const processedResults = data.results
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .map(item => ({
            id: item.id,
            title: item.media_type === 'movie' ? item.title : item.name,
            mediaType: item.media_type,
            overview: item.overview,
            releaseYear: item.media_type === 'movie' 
              ? (item.release_date?.substring(0, 4) || '')
              : (item.first_air_date?.substring(0, 4) || ''),
            rating: item.vote_average?.toFixed(1) || '',
            posterPath: item.poster_path 
              ? `${TMDB_IMG_BASE}${item.poster_path}`
              : '/api/placeholder/300/450'
          }))
          .slice(0, 8);

        // Duplicate the items array for seamless looping
        setMedia([...processedResults, ...processedResults]);
      } catch (err) {
        console.error('Error fetching trending media:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-400">
        Unable to load trending content
      </div>
    );
  }

  return (
    <section className="w-full bg-gradient-to-b from-secondary/10 to-transparent overflow-hidden">
      <div className="py-20" style={{ borderTop: '1px solid rgba(74, 74, 74, 0.2)' }}>
            <h2 className="container text-4xl font-bold text-center mb-4 text-primary">Trending Now</h2>
            <p className="container text-xl text-center mb-12 text-gray-300" style={{padding: '0 0 24px 20px'}}>
            Popular movies and shows you can request
            </p>
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {media.map((item, index) => (
              <div 
                key={`${item.id}-${index}`} 
                className="embla__slide"
              >
                <div className="mx-4">
                  <div className="bg-secondary/20 rounded-m overflow-hidden shadow-lg hover:bg-secondary/30 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="h-[200px] overflow-hidden">
                    <img 
                      src={item.posterPath} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 truncate">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
};

export default TrendingCarousel;