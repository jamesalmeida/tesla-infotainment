export const Dynamics = () => {
    return (
        <div className="buttons-container">
            <div className='label'>Acceleration</div>
            <div className="flex-row row-1">
                <div className='btn'>Chill</div>
                <div className='btn'>Sport</div>
            </div>
            
            <div className='gap-row'></div>

            <div className='label'>Steering Weight</div>
            <div className="flex-row row-2">
              <div className='btn'>Light</div>
              <div className='btn'>Standard</div>
              <div className='btn'>Heavy</div>
            </div>

            <div className='gap-row'></div>
            
            <div className='label'>Track Mode</div>
            <div className="flex-row row-3">
              <div className='btn'>Customize</div>
            </div>

            <div className='gap-row'></div>
            
            <div className='label'>Stopping Mode</div>
            <div className="flex-row row-3">
                <div className='btn'>Creep</div>
                <div className='btn'>Roll</div>
                <div className='btn'>Hold</div>
            </div>
            <div className='description'>Maximizos range by extending regenerative braking to lower
            speeds and automatically blonde in brakes to hold the vehiole at a stop</div>

            <div className='gap-row'></div>
            
            <div className="flex-row row-5">
              <div className='btn'>On/Off Toggle</div>
            </div>
            <div className='label'>Apply brakes when regenerative braking is limited.</div>

            <div className='gap-row'></div>
            
            <div className="flex-row row-5">
              <div className='btn'>On/Off Toggle</div>
            </div>
            <div className='label'>Off Road Assist.</div>

            <div className='gap-row'></div>
            
            <div className="flex-row row-5">
              <div className='btn'>On/Off Toggle</div>
            </div>
            <div className='gap-row'></div>
            
            <div className='label'>Slip Start</div>
            <div className="description">Use to help free vehicle stuck in snow, sand, or mud.</div>
          </div>
    )
}