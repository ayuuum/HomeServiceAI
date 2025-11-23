import { Service } from "@/types/booking";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard = ({ service }: ServiceCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/booking/${service.id}`, { state: { service } });
  };

  return (
    <Card 
      className="card-hover cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={service.imageUrl}
          alt={service.title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-1">{service.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {service.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{service.duration}分</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">
              ¥{service.basePrice.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">税込</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
